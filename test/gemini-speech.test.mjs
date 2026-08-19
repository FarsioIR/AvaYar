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
          .subarray(0, 4)
          .toString("ascii"),
        "RIFF"
      );

      assert.equal(
        result.audio
          .subarray(8, 12)
          .toString("ascii"),
        "WAVE"
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
  "non-429 Gemini errors are not retried",
  async () => {
    let calls = 0;
    let sleeps = 0;

    const client = {
      interactions: {
        async create() {
          calls += 1;

          const error =
            new Error(
              "forbidden"
            );

          error.statusCode =
            403;

          throw error;
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
      calls,
      1
    );

    assert.equal(
      sleeps,
      0
    );
  }
);
