function clean(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export const FREE_PROVIDER_VOICES = Object.freeze({
  female: "fa-IR-DilaraNeural",
  male: "fa-IR-FaridNeural"
});

export function getFreeProviderConfig(env = process.env) {
  return {
    translation: {
      model: "Xenova/m2m100_418M",
      dtype: "q8",
      defaultSourceLanguage:
        clean(env.AVAYAR_TRANSLATION_DEFAULT_SOURCE) ?? "en",
      cacheDir: clean(env.AVAYAR_MODEL_CACHE)
    },
    speech: {
      voices: FREE_PROVIDER_VOICES,
      outputFormat: "WEBM_24KHZ_16BIT_MONO_OPUS"
    }
  };
}

export function getProviderCapabilities(env = process.env) {
  const config = getFreeProviderConfig(env);

  return {
    translationConfigured: true,
    speechConfigured: true,
    provider: "free-keyless-hybrid",
    translationProvider: "local-m2m100",
    speechProvider: "edge-read-aloud",
    requiresApiKey: false,
    targetLanguage: "fa",
    defaultSourceLanguage: config.translation.defaultSourceLanguage,
    model: config.translation.model,
    modelDtype: config.translation.dtype,
    voices: config.speech.voices
  };
}
