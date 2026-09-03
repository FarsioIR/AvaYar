import test from "node:test";
import assert from "node:assert/strict";
import {
  ResilientSpeechService,
  SpeechUnavailableError
} from "../server/speech/resilient-speech-service.mjs";

const config = {
  apiKey: "test-gemini-key-value-1234567890",
  model: "gemini-3.1-flash-tts-preview",
  voices: {
    female: {
      name: "Sulafat",
      gender: "Female",
      locale: "fa-IR"
    },
    male: {
      name: "Iapetus",
      gender: "Male",
      locale: "fa-IR"
    }
  }
};

function audioResult(provider = "gemini-tts") {
  return {
    audio: Buffer.from("RIFF"),
    contentType: "audio/wav",
    voice: config.voices.female,
    provider,
    transport: "test",
    model: "test-model",
    chunkCount: 1
  };
}

test("uses Gemini primary when speech succeeds", async () => {
  const service = new ResilientSpeechService({
    config,
    primaryFactory: () => ({
      synthesize: async () => audioResult()
    })
  });

  const result = await service.synthesize({
    text: "سلام",
    voicePreference: "female"
  });

  assert.equal(result.provider, "gemini-tts");
  assert.equal(result.fallbackFrom, undefined);
});

test("falls back after Gemini 403 without leaking provider error", async () => {
  const secretHtml = "<html>403 forbidden sensitive upstream payload</html>";

  const service = new ResilientSpeechService({
    config,
    primaryFactory: () => ({
      synthesize: async () => {
        const error = new Error(secretHtml);
        error.status = 403;
        throw error;
      }
    }),
    fallbackFactory: ({ failure }) => {
      assert.equal(failure.code, "speech_access_denied");
      assert.equal(failure.status, 403);

      return {
        synthesize: async () => audioResult("fallback-test")
      };
    }
  });

  const result = await service.synthesize({
    text: "سلام",
    voicePreference: "female"
  });

  assert.equal(result.provider, "fallback-test");
  assert.equal(result.fallbackFrom, "gemini-tts");
  assert.equal(result.fallbackReason, "speech_access_denied");
  assert.equal(JSON.stringify(result).includes(secretHtml), false);
});

test("uses fallback even when Gemini is not configured", async () => {
  const service = new ResilientSpeechService({
    config: {
      ...config,
      apiKey: null
    },
    fallbackFactory: ({ failure }) => {
      assert.equal(failure.code, "speech_not_configured");
      return {
        synthesize: async () => audioResult("fallback-test")
      };
    }
  });

  const result = await service.synthesize({
    text: "سلام",
    voicePreference: "female"
  });

  assert.equal(result.provider, "fallback-test");
  assert.equal(result.fallbackFrom, "gemini-tts");
  assert.equal(result.fallbackReason, "speech_not_configured");
});

test("normalizes Gemini 403 into sanitized unavailable state", async () => {
  const secretHtml = "<html>403 forbidden sensitive upstream payload</html>";

  const service = new ResilientSpeechService({
    config,
    primaryFactory: () => ({
      synthesize: async () => {
        const error = new Error(secretHtml);
        error.status = 403;
        throw error;
      }
    })
  });

  await assert.rejects(
    () => service.synthesize({
      text: "سلام",
      voicePreference: "female"
    }),
    error => {
      assert.ok(error instanceof SpeechUnavailableError);
      assert.equal(error.code, "speech_access_denied");
      assert.equal(error.upstreamStatus, 403);
      assert.equal(error.retryable, false);
      assert.equal(error.fallbackAttempted, false);
      assert.equal(error.message, "Persian speech is temporarily unavailable.");
      assert.equal(JSON.stringify(error).includes(secretHtml), false);
      return true;
    }
  );
});

test("returns deterministic unavailable state when speech is unconfigured", async () => {
  const service = new ResilientSpeechService({
    config: {
      ...config,
      apiKey: null
    }
  });

  await assert.rejects(
    () => service.synthesize({
      text: "سلام",
      voicePreference: "female"
    }),
    error => {
      assert.ok(error instanceof SpeechUnavailableError);
      assert.equal(error.code, "speech_not_configured");
      assert.equal(error.retryable, false);
      return true;
    }
  );
});
