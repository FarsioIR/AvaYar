import test from "node:test";
import assert from "node:assert/strict";
import {
  getFreeProviderConfig,
  getProviderCapabilities
} from "../server/config.mjs";

test(
  "keyless provider capabilities require no secret values",
  () => {
    const env = {
      AVAYAR_TRANSLATION_DEFAULT_SOURCE: "en",
      AVAYAR_MODEL_CACHE: "C:\\cache\\avayar"
    };

    const config = getFreeProviderConfig(env);
    const capabilities =
      getProviderCapabilities(env);

    assert.equal(
      config.translation.defaultSourceLanguage,
      "en"
    );
    assert.equal(
      capabilities.translationConfigured,
      true
    );
    assert.equal(
      capabilities.speechConfigured,
      true
    );
    assert.equal(
      capabilities.requiresApiKey,
      false
    );
    assert.equal(
      capabilities.translationProvider,
      "local-m2m100"
    );
    assert.equal(
      capabilities.speechProvider,
      "edge-read-aloud"
    );
    assert.equal(
      capabilities.voices.female,
      "fa-IR-DilaraNeural"
    );
    assert.equal(
      capabilities.voices.male,
      "fa-IR-FaridNeural"
    );
    assert.equal(
      JSON.stringify(capabilities)
        .toLowerCase()
        .includes("secret"),
      false
    );
  }
);
