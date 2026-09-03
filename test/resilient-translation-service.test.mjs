import test from "node:test";
import assert from "node:assert/strict";
import {
  ResilientTranslationService,
  TranslationUnavailableError
} from "../server/translation/resilient-translation-service.mjs";

const baseConfig = {
  provider: "gemini",
  apiKey: "test-gemini-key-value-1234567890",
  model: "gemini-flash-latest",
  localModel: "Xenova/m2m100_418M",
  dtype: "q8",
  defaultSourceLanguage: "en",
  cacheDir: null
};

test("uses Gemini when primary translation succeeds", async () => {
  const service = new ResilientTranslationService({
    config: baseConfig,
    primaryFactory: () => ({
      translateToPersian: async () => "ترجمه اصلی"
    }),
    fallbackFactory: () => ({
      translateToPersian: async () => {
        throw new Error("fallback should not run");
      }
    })
  });

  const result = await service.translateToPersian("Hello");

  assert.deepEqual(result, {
    text: "ترجمه اصلی",
    provider: "gemini"
  });
});

test("falls back to local M2M100 after Gemini 403", async () => {
  const secretHtml = "<html>403 forbidden private payload</html>";

  const service = new ResilientTranslationService({
    config: baseConfig,
    primaryFactory: () => ({
      translateToPersian: async () => {
        const error = new Error(secretHtml);
        error.status = 403;
        throw error;
      }
    }),
    fallbackFactory: () => ({
      translateToPersian: async () => "ترجمه محلی"
    })
  });

  const result = await service.translateToPersian("Hello");

  assert.equal(result.text, "ترجمه محلی");
  assert.equal(result.provider, "local-m2m100");
  assert.equal(result.fallbackFrom, "gemini");
  assert.equal(result.fallbackReason, "translation_access_denied");
  assert.equal(JSON.stringify(result).includes(secretHtml), false);
});

test("uses local translation directly when Gemini key is absent", async () => {
  const service = new ResilientTranslationService({
    config: {
      ...baseConfig,
      apiKey: null,
      provider: "local-m2m100"
    },
    fallbackFactory: () => ({
      translateToPersian: async () => "ترجمه بدون کلید"
    })
  });

  const result = await service.translateToPersian("Hello");

  assert.deepEqual(result, {
    text: "ترجمه بدون کلید",
    provider: "local-m2m100"
  });
});

test("sanitizes failure when Gemini and local fallback both fail", async () => {
  const secretHtml = "<html>sensitive google error</html>";

  const service = new ResilientTranslationService({
    config: baseConfig,
    primaryFactory: () => ({
      translateToPersian: async () => {
        const error = new Error(secretHtml);
        error.status = 403;
        throw error;
      }
    }),
    fallbackFactory: () => ({
      translateToPersian: async () => {
        throw new Error("local internals");
      }
    })
  });

  await assert.rejects(
    () => service.translateToPersian("Hello"),
    error => {
      assert.ok(error instanceof TranslationUnavailableError);
      assert.equal(error.code, "translation_access_denied");
      assert.equal(error.upstreamStatus, 403);
      assert.equal(error.fallbackAttempted, true);
      assert.equal(error.message, "Persian translation is temporarily unavailable.");
      assert.equal(JSON.stringify(error).includes(secretHtml), false);
      return true;
    }
  );
});
