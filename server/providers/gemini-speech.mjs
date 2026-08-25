import {
  GoogleGenAI
} from "@google/genai";

import {
  GEMINI_PERSIAN_VOICES,
  GEMINI_TTS_MODEL
} from "../config.mjs";

import {
  buildIranianPersianNarrationPrompt,
  preparePersianNarration,
  splitPersianNarration
} from "../speech/persian-narration.mjs";

const DEFAULT_RATE_LIMIT_RETRIES = 4;
const DEFAULT_RETRY_MS = 30000;
const MAX_RETRY_MS = 60000;

function assertKey(apiKey) {
  if (typeof apiKey !== "string" || apiKey.trim().length < 20) {
    throw new Error("GEMINI_API_KEY is required for Persian speech.");
  }
}

function defaultClientFactory({ apiKey }) {
  return new GoogleGenAI({ apiKey });
}

function defaultSleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function statusFromError(error) {
  const value =
    error?.statusCode ??
    error?.status ??
    error?.cause?.statusCode ??
    error?.cause?.status;

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function retryDelayFromError(error) {
  const message = [
    error?.message,
    error?.body,
    error?.cause?.message
  ].filter(Boolean).join("\n");

  const match = message.match(/retry\s+in\s+([0-9.]+)s/i);

  if (match) {
    return Math.min(
      MAX_RETRY_MS,
      Math.max(1000, Math.ceil(Number(match[1]) * 1000) + 1000)
    );
  }

  return DEFAULT_RETRY_MS;
}

function findGenerateContentAudioData(response) {
  const parts = response?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return null;
  }

  return parts.find(
    part => typeof part?.inlineData?.data === "string"
  )?.inlineData?.data ?? null;
}

function pcm16Mono24kToWav(pcm) {
  const header = Buffer.alloc(44);
  const sampleRate = 24000;
  const channels = 1;
  const bitsPerSample = 16;

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
  header.writeUInt16LE(channels * bitsPerSample / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

export class GeminiPersianSpeechSynthesizer {
  constructor({
    apiKey,
    clientFactory = defaultClientFactory,
    model = GEMINI_TTS_MODEL,
    voices = GEMINI_PERSIAN_VOICES,
    maxChunkChars = 3200,
    maxRateLimitRetries = DEFAULT_RATE_LIMIT_RETRIES,
    sleepImpl = defaultSleep
  } = {}) {
    assertKey(apiKey);

    this.client = clientFactory({ apiKey: apiKey.trim() });
    this.model = model;
    this.voices = voices;
    this.maxChunkChars = maxChunkChars;
    this.maxRateLimitRetries = maxRateLimitRetries;
    this.sleepImpl = sleepImpl;

    this.hasGenerateContent =
      typeof this.client?.models?.generateContent === "function";

    this.hasInteractions =
      typeof this.client?.interactions?.create === "function";

    if (!this.hasGenerateContent && !this.hasInteractions) {
      throw new TypeError(
        "Gemini client must expose a supported speech transport."
      );
    }
  }

  async retry429(operation) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (
          statusFromError(error) !== 429 ||
          attempt >= this.maxRateLimitRetries
        ) {
          throw error;
        }

        await this.sleepImpl(retryDelayFromError(error));
      }
    }
  }

  async interactionsWithRetry(request) {
    return this.retry429(() => this.client.interactions.create(request));
  }

  async generateContentWithRetry(request) {
    return this.retry429(() => this.client.models.generateContent(request));
  }

  async synthesizeChunk({ chunk, voice }) {
    const prompt = buildIranianPersianNarrationPrompt(chunk);

    let data = null;
    let transport = null;

    if (this.hasInteractions) {
      try {
        const interaction = await this.interactionsWithRetry({
          model: this.model,
          input: prompt,
          response_format: { type: "audio" },
          generation_config: {
            speech_config: [{ voice: voice.name }]
          }
        });

        data = interaction?.output_audio?.data;
        transport = "official-google-genai-sdk-interactions";
      } catch (error) {
        const errorText = JSON.stringify(error).toLowerCase();

        const invalidRequest =
          statusFromError(error) === 400 &&
          errorText.includes("invalid_request");

        if (!invalidRequest) {
          throw error;
        }
      }
    }

    if (!data && this.hasGenerateContent) {
      const generated = await this.generateContentWithRetry({
        model: this.model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice.name
              }
            }
          }
        }
      });

      data = findGenerateContentAudioData(generated);
      transport = "official-google-genai-sdk-generate-content-fallback";
    }

    if (typeof data !== "string") {
      throw new Error(
        "Gemini TTS response did not include base64 PCM audio."
      );
    }

    return {
      pcm: Buffer.from(data, "base64"),
      transport
    };
  }

  async synthesize({
    text,
    voicePreference = "female"
  }) {
    const voice = this.voices[voicePreference];

    if (!voice) {
      throw new TypeError(
        `Unsupported voice preference: ${voicePreference}`
      );
    }

    const chunks = splitPersianNarration(
      preparePersianNarration(text),
      {
        maxChars: this.maxChunkChars
      }
    );

    const pcmChunks = [];
    const transports = new Set();

    for (const chunk of chunks) {
      const result = await this.synthesizeChunk({
        chunk,
        voice
      });

      pcmChunks.push(result.pcm);
      transports.add(result.transport);
    }

    return {
      audio: pcm16Mono24kToWav(Buffer.concat(pcmChunks)),
      contentType: "audio/wav",
      voice,
      provider: "gemini-tts",
      transport:
        transports.size === 1
          ? [...transports][0]
          : "official-google-genai-sdk-mixed",
      model: this.model,
      chunkCount: chunks.length,
      preparedText: preparePersianNarration(text)
    };
  }
}


