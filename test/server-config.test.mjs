import test from "node:test";
import assert from "node:assert/strict";
import {
  GEMINI_PERSIAN_VOICES,
  GEMINI_TTS_MODEL,
  getProviderConfig,
  getProviderCapabilities
} from "../server/config.mjs";

test("speech is disabled without a server-side Gemini key", () => {
  const capabilities = getProviderCapabilities({
    AVAYAR_TRANSLATION_DEFAULT_SOURCE: "en"
  });

  assert.equal(capabilities.translationConfigured, true);
  assert.equal(capabilities.speechConfigured, false);
  assert.equal(capabilities.speechRequiresApiKey, true);
  assert.equal(capabilities.speechProvider, "gemini-tts");
  assert.equal(capabilities.speechModel, GEMINI_TTS_MODEL);
  assert.equal(capabilities.voices.female, GEMINI_PERSIAN_VOICES.female.name);
  assert.equal(capabilities.voices.male, GEMINI_PERSIAN_VOICES.male.name);
});

test("speech capabilities never expose the Gemini secret", () => {
  const secret = "test-gemini-secret-value-123456789";
  const config = getProviderConfig({ GEMINI_API_KEY: secret });
  const capabilities = getProviderCapabilities({ GEMINI_API_KEY: secret });

  assert.equal(config.speech.apiKey, secret);
  assert.equal(capabilities.speechConfigured, true);
  assert.equal(capabilities.speechLocale, "fa-IR");
  assert.equal(JSON.stringify(capabilities).includes(secret), false);
});
