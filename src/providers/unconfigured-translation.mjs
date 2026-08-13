export class TranslationProviderNotConfiguredError extends Error {
  constructor() {
    super(
      "Translation provider is not configured in M2. Persian input works now; non-Persian translation is the next provider-integration milestone."
    );
    this.name = "TranslationProviderNotConfiguredError";
    this.code = "TRANSLATION_PROVIDER_NOT_CONFIGURED";
  }
}

export class UnconfiguredTranslationProvider {
  async translateToPersian() {
    throw new TranslationProviderNotConfiguredError();
  }
}
