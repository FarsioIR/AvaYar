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
const DEFAULT_RETRY_MS = 30_000;
const MAX_RETRY_MS = 60_000;

function assertKey(apiKey) {
  if (
    typeof apiKey !== "string" ||
    apiKey.trim().length < 20
  ) {
    throw new Error(
      "GEMINI_API_KEY is required for Persian speech."
    );
  }
}

function pcm16Mono24kToWav(pcm) {
  if (
    !Buffer.isBuffer(pcm) ||
    pcm.length < 2 ||
    pcm.length % 2 !== 0
  ) {
    throw new Error(
      "Gemini TTS returned invalid PCM audio."
    );
  }

  const header =
    Buffer.alloc(44);

  const sampleRate = 24000;
  const channels = 1;
  const bitsPerSample = 16;

  const byteRate =
    sampleRate *
    channels *
    bitsPerSample /
    8;

  const blockAlign =
    channels *
    bitsPerSample /
    8;

  header.write(
    "RIFF",
    0,
    "ascii"
  );

  header.writeUInt32LE(
    36 + pcm.length,
    4
  );

  header.write(
    "WAVE",
    8,
    "ascii"
  );

  header.write(
    "fmt ",
    12,
    "ascii"
  );

  header.writeUInt32LE(
    16,
    16
  );

  header.writeUInt16LE(
    1,
    20
  );

  header.writeUInt16LE(
    channels,
    22
  );

  header.writeUInt32LE(
    sampleRate,
    24
  );

  header.writeUInt32LE(
    byteRate,
    28
  );

  header.writeUInt16LE(
    blockAlign,
    32
  );

  header.writeUInt16LE(
    bitsPerSample,
    34
  );

  header.write(
    "data",
    36,
    "ascii"
  );

  header.writeUInt32LE(
    pcm.length,
    40
  );

  return Buffer.concat([
    header,
    pcm
  ]);
}

function defaultClientFactory({
  apiKey
}) {
  return new GoogleGenAI({
    apiKey
  });
}

function defaultSleep(ms) {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        ms
      );
    }
  );
}

function statusFromError(error) {
  const candidate =
    error?.statusCode ??
    error?.status ??
    error?.cause?.statusCode ??
    error?.cause?.status;

  const numeric =
    Number(candidate);

  return Number.isFinite(numeric)
    ? numeric
    : 0;
}

function retryDelayFromError(error) {
  const headerValue =
    typeof error?.headers?.get === "function"
      ? error.headers.get(
          "retry-after"
        )
      : null;

  if (
    typeof headerValue === "string" &&
    headerValue.trim()
  ) {
    const seconds =
      Number(headerValue);

    if (
      Number.isFinite(seconds) &&
      seconds >= 0
    ) {
      return Math.min(
        MAX_RETRY_MS,
        Math.max(
          1000,
          Math.ceil(
            seconds * 1000
          ) + 500
        )
      );
    }
  }

  const message =
    [
      error?.message,
      error?.body,
      error?.cause?.message,
      error?.cause?.body
    ]
      .filter(Boolean)
      .join("\n");

  const match =
    message.match(
      /retry\s+in\s+([0-9]+(?:\.[0-9]+)?)s/i
    );

  if (match) {
    const seconds =
      Number(match[1]);

    if (
      Number.isFinite(seconds)
    ) {
      return Math.min(
        MAX_RETRY_MS,
        Math.max(
          1000,
          Math.ceil(
            seconds * 1000
          ) + 1000
        )
      );
    }
  }

  return DEFAULT_RETRY_MS;
}

export class GeminiPersianSpeechSynthesizer {
  constructor({
    apiKey,
    clientFactory =
      defaultClientFactory,
    model =
      GEMINI_TTS_MODEL,
    voices =
      GEMINI_PERSIAN_VOICES,
    maxChunkChars = 3200,
    maxRateLimitRetries =
      DEFAULT_RATE_LIMIT_RETRIES,
    sleepImpl =
      defaultSleep
  } = {}) {
    assertKey(apiKey);

    if (
      typeof clientFactory !==
        "function"
    ) {
      throw new TypeError(
        "A Gemini client factory is required."
      );
    }

    if (
      typeof sleepImpl !==
        "function"
    ) {
      throw new TypeError(
        "A sleep implementation is required."
      );
    }

    if (
      !Number.isInteger(
        maxRateLimitRetries
      ) ||
      maxRateLimitRetries < 0 ||
      maxRateLimitRetries > 8
    ) {
      throw new TypeError(
        "maxRateLimitRetries must be an integer from 0 to 8."
      );
    }

    this.apiKey =
      apiKey.trim();

    this.client =
      clientFactory({
        apiKey:
          this.apiKey
      });

    if (
      !this.client?.interactions ||
      typeof this.client
        .interactions
        .create !==
          "function"
    ) {
      throw new TypeError(
        "Gemini client must expose interactions.create()."
      );
    }

    this.model =
      model;

    this.voices =
      voices;

    this.maxChunkChars =
      maxChunkChars;

    this.maxRateLimitRetries =
      maxRateLimitRetries;

    this.sleepImpl =
      sleepImpl;
  }

  async createInteractionWithRetry(
    request
  ) {
    for (
      let attempt = 0;
      ;
      attempt += 1
    ) {
      try {
        return await this.client
          .interactions
          .create(
            request
          );
      } catch (error) {
        const isRateLimit =
          statusFromError(
            error
          ) === 429;

        if (
          !isRateLimit ||
          attempt >=
            this.maxRateLimitRetries
        ) {
          throw error;
        }

        const delayMs =
          retryDelayFromError(
            error
          );

        await this.sleepImpl(
          delayMs
        );
      }
    }
  }

  async synthesizeChunk({
    chunk,
    voice
  }) {
    const interaction =
      await this
        .createInteractionWithRetry({
          model:
            this.model,
          input:
            buildIranianPersianNarrationPrompt(
              chunk
            ),
          response_format: {
            type:
              "audio"
          },
          generation_config: {
            speech_config: [
              {
                voice:
                  voice.name
              }
            ]
          }
        });

    const data =
      interaction
        ?.output_audio
        ?.data;

    if (
      typeof data !== "string" ||
      data.length < 16
    ) {
      throw new Error(
        "Gemini TTS response did not include output_audio.data."
      );
    }

    const pcm =
      Buffer.from(
        data,
        "base64"
      );

    if (
      pcm.byteLength < 100 ||
      pcm.byteLength % 2 !== 0
    ) {
      throw new Error(
        "Gemini TTS returned invalid 16-bit PCM audio."
      );
    }

    return pcm;
  }

  async synthesize({
    text,
    voicePreference = "female"
  }) {
    const voice =
      this.voices[
        voicePreference
      ];

    if (!voice) {
      throw new TypeError(
        `Unsupported voice preference: ${voicePreference}`
      );
    }

    const preparedText =
      preparePersianNarration(
        text
      );

    const chunks =
      splitPersianNarration(
        preparedText,
        {
          maxChars:
            this.maxChunkChars
        }
      );

    const pcmChunks = [];

    for (
      const chunk of chunks
    ) {
      pcmChunks.push(
        await this
          .synthesizeChunk({
            chunk,
            voice
          })
      );
    }

    return {
      audio:
        pcm16Mono24kToWav(
          Buffer.concat(
            pcmChunks
          )
        ),
      contentType:
        "audio/wav",
      voice,
      provider:
        "gemini-tts",
      transport:
        "official-google-genai-sdk-interactions",
      model:
        this.model,
      chunkCount:
        chunks.length,
      preparedText
    };
  }
}
