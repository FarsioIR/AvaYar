function clean(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export const GEMINI_PERSIAN_VOICES = Object.freeze({
  female: Object.freeze({
    name: "Sulafat",
    gender: "Female",
    locale: "fa-IR",
    character: "Warm"
  }),
  male: Object.freeze({
    name: "Iapetus",
    gender: "Male",
    locale: "fa-IR",
    character: "Clear"
  })
});

export const GEMINI_TTS_MODEL = "gemini-3.1-flash-tts-preview";

export function getProviderConfig(env = process.env) {
  const geminiApiKey = clean(env.GEMINI_API_KEY);

  return {
    translation: {
      model: "Xenova/m2m100_418M",
      dtype: "q8",
      defaultSourceLanguage:
        clean(env.AVAYAR_TRANSLATION_DEFAULT_SOURCE) ?? "en",
      cacheDir: clean(env.AVAYAR_MODEL_CACHE)
    },
    speech: {
      provider: "gemini-tts",
      model: GEMINI_TTS_MODEL,
      apiKey: geminiApiKey,
      locale: "fa-IR",
      voices: GEMINI_PERSIAN_VOICES
    }
  };
}

export function getProviderCapabilities(env = process.env) {
  const config = getProviderConfig(env);

  return {
    translationConfigured: true,
    speechConfigured: Boolean(config.speech.apiKey),
    translationProvider: "local-m2m100",
    speechProvider: "gemini-tts",
    speechRequiresApiKey: true,
    requiresApiKey: true,
    targetLanguage: "fa",
    speechLocale: "fa-IR",
    defaultSourceLanguage: config.translation.defaultSourceLanguage,
    model: config.translation.model,
    modelDtype: config.translation.dtype,
    speechModel: config.speech.model,
    voices: {
      female: config.speech.voices.female.name,
      male: config.speech.voices.male.name
    }
  };
}
