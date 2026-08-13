import test from "node:test";
import assert from "node:assert/strict";
import {
  getAzureConfig,
  getProviderCapabilities
} from "../server/config.mjs";

test("provider capabilities expose configuration state without secret values", () => {
  const env = {
    AZURE_TRANSLATOR_KEY: "secret-translator",
    AZURE_TRANSLATOR_REGION: "westeurope",
    AZURE_SPEECH_KEY: "secret-speech",
    AZURE_SPEECH_REGION: "westeurope"
  };

  const config = getAzureConfig(env);
  const capabilities = getProviderCapabilities(env);

  assert.equal(config.translator.key, "secret-translator");
  assert.equal(capabilities.translationConfigured, true);
  assert.equal(capabilities.speechConfigured, true);
  assert.equal(capabilities.voices.female, "fa-IR-DilaraNeural");
  assert.equal(capabilities.voices.male, "fa-IR-FaridNeural");
  assert.equal(JSON.stringify(capabilities).includes("secret"), false);
});
