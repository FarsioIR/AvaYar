import test from "node:test";
import assert from "node:assert/strict";
import {
  GeminiPersianSpeechSynthesizer
} from "../server/providers/gemini-speech.mjs";

function audioResponse() {
  return {
    output_audio: {
      data:
        Buffer
          .alloc(
            4800,
            11
          )
          .toString(
            "base64"
          )
    }
  };
}

function generatedAudioResponse() {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              inlineData: {
                mimeType:
                  "audio/L16;codec=pcm;rate=24000",
                data:
                  Buffer
                    .alloc(
                      4800,
                      13
                    )
                    .toString(
                      "base64"
                    )
              }
            }
          ]
        }
      }
    ]
  };
}

function createFakeClient(
  calls
) {
  return {
    interactions: {
      async create(
        request
      ) {
        calls.push(
          request
        );

        return audioResponse();
      }
    }
  };
}

for (const [
  preference,
  expectedVoice,
  expectedGender
] of [
  [
    "female",
    "Sulafat",
    "Female"
  ],
  [
    "male",
    "Iapetus",
    "Male"
  ]
]) {
  test(
    `${preference} uses exact official Gemini SDK Iranian Persian voice contract`,
    async () => {
      const calls = [];

      const synthesizer =
        new GeminiPersianSpeechSynthesizer({
          apiKey:
            "test-key-abcdefghijklmnopqrstuvwxyz",
          clientFactory:
            () =>
              createFakeClient(
                calls
              )
        });

      const result =
        await synthesizer.synthesize({
          text:
            "این جمله تمام شد.\n" +
            "این جمله بعد از خط جدید است.",
          voicePreference:
            preference
        });

      assert.equal(
        result.voice.name,
        expectedVoice
      );

      assert.equal(
        result.voice.gender,
        expectedGender
      );

      assert.equal(
        result.voice.locale,
        "fa-IR"
      );

      assert.equal(
        result.provider,
        "gemini-tts"
      );

      assert.equal(
        result.transport,
        "official-google-genai-sdk-interactions"
      );

      assert.equal(
        result.contentType,
        "audio/wav"
      );

      assert.equal(
        result.audio
          .subarray(
            0,
            4
          )
          .toString(
            "ascii"
          ),
        "RIFF"
      );

      assert.equal(
        calls[0].model,
        "gemini-3.1-flash-tts-preview"
      );

      assert.equal(
        calls[0]
          .response_format
          .type,
        "audio"
      );

      assert.equal(
        calls[0]
          .generation_config
          .speech_config[0]
          .voice,
        expectedVoice
      );

      assert.match(
        calls[0].input,
        /standard Iranian Persian \(fa-IR\)/u
      );

      assert.match(
        calls[0].input,
        /\[medium pause\]/u
      );
    }
  );
}

test(
  "429 is retried using Gemini retry-in guidance",
  async () => {
    const calls = [];
    const sleeps = [];

    const client = {
      interactions: {
        async create(
          request
        ) {
          calls.push(
            request
          );

          if (
            calls.length === 1
          ) {
            const error =
              new Error(
                "429 quota exhausted. Please retry in 1.25s."
              );

            error.statusCode =
              429;

            throw error;
          }

          return audioResponse();
        }
      }
    };

    const synthesizer =
      new GeminiPersianSpeechSynthesizer({
        apiKey:
          "test-key-abcdefghijklmnopqrstuvwxyz",
        clientFactory:
          () =>
            client,
        sleepImpl:
          async (
            delayMs
          ) => {
            sleeps.push(
              delayMs
            );
          }
      });

    const result =
      await synthesizer.synthesize({
        text:
          "آوایار.",
        voicePreference:
          "female"
      });

    assert.equal(
      calls.length,
      2
    );

    assert.deepEqual(
      sleeps,
      [
        2250
      ]
    );

    assert.equal(
      result.voice.name,
      "Sulafat"
    );
  }
);

test(
  "non-429 non-invalid-request Gemini errors are not retried or fallen back",
  async () => {
    let interactionCalls = 0;
    let fallbackCalls = 0;
    let sleeps = 0;

    const client = {
      interactions: {
        async create() {
          interactionCalls += 1;

          const error =
            new Error(
              "forbidden"
            );

          error.statusCode =
            403;

          throw error;
        }
      },
      models: {
        async generateContent() {
          fallbackCalls += 1;
          return generatedAudioResponse();
        }
      }
    };

    const synthesizer =
      new GeminiPersianSpeechSynthesizer({
        apiKey:
          "test-key-abcdefghijklmnopqrstuvwxyz",
        clientFactory:
          () =>
            client,
        sleepImpl:
          async () => {
            sleeps += 1;
          }
      });

    await assert.rejects(
      () =>
        synthesizer.synthesize({
          text:
            "آوایار.",
          voicePreference:
            "female"
        }),
      /forbidden/u
    );

    assert.equal(
      interactionCalls,
      1
    );

    assert.equal(
      fallbackCalls,
      0
    );

    assert.equal(
      sleeps,
      0
    );
  }
);

test(
  "Interactions 400 invalid_request falls back to official models.generateContent",
  async () => {
    const interactionCalls = [];
    const generateCalls = [];

    const client = {
      interactions: {
        async create(
          request
        ) {
          interactionCalls.push(
            request
          );

          const error =
            new Error(
              "400 Request contains an invalid argument."
            );

          error.statusCode =
            400;

          error.error = {
            error: {
              code:
                "invalid_request",
              message:
                "Request contains an invalid argument."
            }
          };

          throw error;
        }
      },
      models: {
        async generateContent(
          request
        ) {
          generateCalls.push(
            request
          );

          return generatedAudioResponse();
        }
      }
    };

    const synthesizer =
      new GeminiPersianSpeechSynthesizer({
        apiKey:
          "test-key-abcdefghijklmnopqrstuvwxyz",
        clientFactory:
          () =>
            client
      });

    const result =
      await synthesizer.synthesize({
        text:
          "آوایار.",
        voicePreference:
          "female"
      });

    assert.equal(
      interactionCalls.length,
      1
    );

    assert.equal(
      generateCalls.length,
      1
    );

    assert.equal(
      result.transport,
      "official-google-genai-sdk-generate-content-fallback"
    );

    assert.equal(
      generateCalls[0].model,
      "gemini-3.1-flash-tts-preview"
    );

    assert.deepEqual(
      generateCalls[0]
        .config
        .responseModalities,
      [
        "AUDIO"
      ]
    );

    assert.equal(
      generateCalls[0]
        .config
        .speechConfig
        .voiceConfig
        .prebuiltVoiceConfig
        .voiceName,
      "Sulafat"
    );

    assert.match(
      generateCalls[0].contents,
      /standard Iranian Persian \(fa-IR\)/u
    );

    assert.equal(
      result.audio
        .subarray(
          0,
          4
        )
        .toString(
          "ascii"
        ),
      "RIFF"
    );
  }
);

test(
  "429 from generateContent fallback is retried with the same bounded policy",
  async () => {
    let interactionCalls = 0;
    let generateCalls = 0;
    const sleeps = [];

    const client = {
      interactions: {
        async create() {
          interactionCalls += 1;

          const error =
            new Error(
              "Request contains an invalid argument."
            );

          error.statusCode =
            400;

          error.error = {
            error: {
              code:
                "invalid_request"
            }
          };

          throw error;
        }
      },
      models: {
        async generateContent() {
          generateCalls += 1;

          if (
            generateCalls === 1
          ) {
            const error =
              new Error(
                "429 quota. Please retry in 1s."
              );

            error.statusCode =
              429;

            throw error;
          }

          return generatedAudioResponse();
        }
      }
    };

    const synthesizer =
      new GeminiPersianSpeechSynthesizer({
        apiKey:
          "test-key-abcdefghijklmnopqrstuvwxyz",
        clientFactory:
          () =>
            client,
        sleepImpl:
          async (
            delayMs
          ) => {
            sleeps.push(
              delayMs
            );
          }
      });

    const result =
      await synthesizer.synthesize({
        text:
          "آوایار.",
        voicePreference:
          "female"
      });

    assert.equal(
      interactionCalls,
      1
    );

    assert.equal(
      generateCalls,
      2
    );

    assert.deepEqual(
      sleeps,
      [
        2000
      ]
    );

    assert.equal(
      result.transport,
      "official-google-genai-sdk-generate-content-fallback"
    );
  }
);
