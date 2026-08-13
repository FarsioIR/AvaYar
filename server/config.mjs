function clean(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getAzureConfig(env = process.env) {
  return {
    translator: {
      key: clean(env.AZURE_TRANSLATOR_KEY),
      region: clean(env.AZURE_TRANSLATOR_REGION),
      endpoint:
        clean(env.AZURE_TRANSLATOR_ENDPOINT) ??
        "https://api.cognitive.microsofttranslator.com"
    },
    speech: {
      key: clean(env.AZURE_SPEECH_KEY),
      region: clean(env.AZURE_SPEECH_REGION)
    }
  };
}

export function getProviderCapabilities(env = process.env) {
  const config = getAzureConfig(env);

  return {
    translationConfigured: Boolean(config.translator.key),
    speechConfigured: Boolean(config.speech.key && config.speech.region),
    provider: "azure",
    targetLanguage: "fa",
    voices: {
      female: "fa-IR-DilaraNeural",
      male: "fa-IR-FaridNeural"
    }
  };
}
