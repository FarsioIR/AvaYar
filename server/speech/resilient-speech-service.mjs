import {
  GeminiPersianSpeechSynthesizer
} from "../providers/gemini-speech.mjs";

function statusFromError(error) {
  const value =
    error?.statusCode ??
    error?.status ??
    error?.cause?.statusCode ??
    error?.cause?.status;

  const status = Number(value);
  return Number.isFinite(status) ? status : 0;
}

function classifySpeechFailure(error) {
  const status = statusFromError(error);

  if (status === 401 || status === 403) {
    return {
      code: "speech_access_denied",
      status,
      retryable: false
    };
  }

  if (status === 404) {
    return {
      code: "speech_model_unavailable",
      status,
      retryable: false
    };
  }

  if (status === 429) {
    return {
      code: "speech_rate_limited",
      status,
      retryable: true
    };
  }

  if (status >= 500 && status <= 599) {
    return {
      code: "speech_upstream_unavailable",
      status,
      retryable: true
    };
  }

  return {
    code: "speech_upstream_error",
    status,
    retryable: true
  };
}

export class SpeechUnavailableError extends Error {
  constructor({
    code = "speech_unavailable",
    provider = "gemini-tts",
    upstreamStatus = 0,
    retryable = true,
    fallbackAttempted = false
  } = {}) {
    super("Persian speech is temporarily unavailable.");
    this.name = "SpeechUnavailableError";
    this.code = code;
    this.provider = provider;
    this.upstreamStatus = upstreamStatus;
    this.retryable = retryable;
    this.fallbackAttempted = fallbackAttempted;
  }
}

export function isSpeechUnavailableError(error) {
  return error instanceof SpeechUnavailableError;
}

function defaultPrimaryFactory(config) {
  return new GeminiPersianSpeechSynthesizer({
    apiKey: config.apiKey,
    model: config.model,
    voices: config.voices
  });
}

export class ResilientSpeechService {
  constructor({
    config,
    primaryFactory = defaultPrimaryFactory,
    fallbackFactory = null
  } = {}) {
    this.config = config ?? {};
    this.primaryFactory = primaryFactory;
    this.fallbackFactory = fallbackFactory;
  }

  async synthesize(request) {
    if (!this.config.apiKey) {
      throw new SpeechUnavailableError({
        code: "speech_not_configured",
        retryable: false
      });
    }

    try {
      const primary = this.primaryFactory(this.config);
      return await primary.synthesize(request);
    } catch (primaryError) {
      const failure = classifySpeechFailure(primaryError);

      if (typeof this.fallbackFactory === "function") {
        try {
          const fallback = this.fallbackFactory({
            config: this.config,
            failure
          });

          if (fallback && typeof fallback.synthesize === "function") {
            const result = await fallback.synthesize(request);
            return {
              ...result,
              fallbackFrom: "gemini-tts",
              fallbackReason: failure.code
            };
          }
        } catch {
          // Never expose fallback-provider internals to API consumers.
        }
      }

      throw new SpeechUnavailableError({
        code: failure.code,
        upstreamStatus: failure.status,
        retryable: failure.retryable,
        fallbackAttempted: typeof this.fallbackFactory === "function"
      });
    }
  }
}
