import {
  GeminiPersianTranslator
} from "../providers/gemini-translation.mjs";
import {
  LocalM2M100Translator
} from "../providers/local-m2m100-translator.mjs";

function statusFromError(error) {
  const value =
    error?.statusCode ??
    error?.status ??
    error?.cause?.statusCode ??
    error?.cause?.status;

  const status = Number(value);
  return Number.isFinite(status) ? status : 0;
}

function classifyTranslationFailure(error) {
  const status = statusFromError(error);

  if (status === 401 || status === 403) {
    return {
      code: "translation_access_denied",
      status,
      retryable: false
    };
  }

  if (status === 404) {
    return {
      code: "translation_model_unavailable",
      status,
      retryable: false
    };
  }

  if (status === 429) {
    return {
      code: "translation_rate_limited",
      status,
      retryable: true
    };
  }

  if (status >= 500 && status <= 599) {
    return {
      code: "translation_upstream_unavailable",
      status,
      retryable: true
    };
  }

  return {
    code: "translation_upstream_error",
    status,
    retryable: true
  };
}

export class TranslationUnavailableError extends Error {
  constructor({
    code = "translation_unavailable",
    provider = "gemini",
    upstreamStatus = 0,
    retryable = true,
    fallbackAttempted = false
  } = {}) {
    super("Persian translation is temporarily unavailable.");
    this.name = "TranslationUnavailableError";
    this.code = code;
    this.provider = provider;
    this.upstreamStatus = upstreamStatus;
    this.retryable = retryable;
    this.fallbackAttempted = fallbackAttempted;
  }
}

export function isTranslationUnavailableError(error) {
  return error instanceof TranslationUnavailableError;
}

function defaultGeminiFactory(config) {
  return new GeminiPersianTranslator({
    apiKey: config.apiKey,
    model: config.model
  });
}

function defaultLocalFactory({
  config,
  pipelineFactory,
  languageDetector
}) {
  return new LocalM2M100Translator({
    config,
    pipelineFactory,
    languageDetector
  });
}

export class ResilientTranslationService {
  constructor({
    config,
    primaryFactory = defaultGeminiFactory,
    fallbackFactory = defaultLocalFactory,
    pipelineFactory,
    languageDetector
  } = {}) {
    if (!config) {
      throw new TypeError("Translation provider config is required.");
    }

    this.config = config;
    this.primaryFactory = primaryFactory;
    this.fallbackFactory = fallbackFactory;
    this.pipelineFactory = pipelineFactory;
    this.languageDetector = languageDetector;
  }

  createLocalTranslator() {
    return this.fallbackFactory({
      config: this.config,
      pipelineFactory: this.pipelineFactory,
      languageDetector: this.languageDetector
    });
  }

  async translateWithLocal(text, options, metadata = {}) {
    const fallback = this.createLocalTranslator();

    if (!fallback || typeof fallback.translateToPersian !== "function") {
      throw new Error("Local translation fallback is unavailable.");
    }

    const translated = await fallback.translateToPersian(text, options);

    return {
      text: translated,
      provider: "local-m2m100",
      ...metadata
    };
  }

  async translateToPersian(text, options = {}) {
    if (
      this.config.provider === "local-m2m100" ||
      !this.config.apiKey
    ) {
      try {
        return await this.translateWithLocal(text, options);
      } catch {
        throw new TranslationUnavailableError({
          code: "translation_local_unavailable",
          provider: "local-m2m100",
          retryable: true,
          fallbackAttempted: false
        });
      }
    }

    try {
      const primary = this.primaryFactory(this.config);
      const translated = await primary.translateToPersian(text, options);

      return {
        text: translated,
        provider: "gemini"
      };
    } catch (primaryError) {
      const failure = classifyTranslationFailure(primaryError);

      try {
        return await this.translateWithLocal(text, options, {
          fallbackFrom: "gemini",
          fallbackReason: failure.code
        });
      } catch {
        throw new TranslationUnavailableError({
          code: failure.code,
          provider: "gemini",
          upstreamStatus: failure.status,
          retryable: failure.retryable,
          fallbackAttempted: true
        });
      }
    }
  }
}
