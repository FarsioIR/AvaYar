import {
  getProviderConfig,
  getProviderCapabilities
} from "./config.mjs";
import {
  WebpageExtractor
} from "./extraction/webpage-extractor.mjs";
import {
  ResilientSpeechService,
  isSpeechUnavailableError
} from "./speech/resilient-speech-service.mjs";
import {
  ResilientTranslationService,
  isTranslationUnavailableError
} from "./translation/resilient-translation-service.mjs";

const MAX_JSON_BYTES = 128 * 1024;

function json(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > MAX_JSON_BYTES) {
      throw new Error("Request body is too large.");
    }

    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

export function createApiHandler({
  env = process.env,
  translationPipelineFactory,
  translationLanguageDetector,
  translationPrimaryFactory,
  translationFallbackFactory,
  translationServiceFactory,
  speechFactory,
  speechFallbackFactory,
  speechServiceFactory,
  webpageExtractorFactory
} = {}) {
  return async function handleApi(request, response) {
    const url = new URL(
      request.url ?? "/",
      "http://127.0.0.1"
    );

    if (!url.pathname.startsWith("/api/")) {
      return false;
    }

    try {
      if (
        request.method === "GET" &&
        url.pathname === "/api/capabilities"
      ) {
        json(response, 200, getProviderCapabilities(env));
        return true;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/extract"
      ) {
        const body = await readJson(request);
        const extractor = webpageExtractorFactory
          ? webpageExtractorFactory()
          : new WebpageExtractor();

        json(response, 200, await extractor.extract(body.url));
        return true;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/translate"
      ) {
        const body = await readJson(request);
        const config = getProviderConfig(env);

        const translationService = translationServiceFactory
          ? translationServiceFactory(config.translation)
          : new ResilientTranslationService({
              config: config.translation,
              primaryFactory: translationPrimaryFactory,
              fallbackFactory: translationFallbackFactory,
              pipelineFactory: translationPipelineFactory,
              languageDetector: translationLanguageDetector
            });

        const result = await translationService.translateToPersian(
          body.text,
          {
            sourceLanguage:
              typeof body.sourceLanguage === "string"
                ? body.sourceLanguage
                : null
          }
        );

        json(response, 200, {
          text: result.text,
          to: "fa",
          provider: result.provider,
          ...(result.fallbackFrom
            ? {
                fallbackFrom: result.fallbackFrom,
                fallbackReason: result.fallbackReason
              }
            : {})
        });
        return true;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/tts"
      ) {
        const body = await readJson(request);
        const config = getProviderConfig(env);

        const speechService = speechServiceFactory
          ? speechServiceFactory(config.speech)
          : new ResilientSpeechService({
              config: config.speech,
              primaryFactory: speechFactory
                ? () => speechFactory(config.speech)
                : undefined,
              fallbackFactory: speechFallbackFactory ?? null
            });

        const result = await speechService.synthesize({
          text: body.text,
          voicePreference: body.voicePreference
        });

        const headers = {
          "content-type": result.contentType,
          "cache-control": "no-store",
          "x-avayar-voice-name": result.voice.name,
          "x-avayar-voice-gender": result.voice.gender,
          "x-avayar-voice-locale": result.voice.locale,
          "x-avayar-speech-provider": result.provider,
          "x-avayar-speech-transport": result.transport,
          "x-avayar-speech-model": result.model,
          "x-avayar-speech-chunks": String(result.chunkCount)
        };

        if (result.fallbackFrom) {
          headers["x-avayar-speech-fallback-from"] = result.fallbackFrom;
          headers["x-avayar-speech-fallback-reason"] = result.fallbackReason;
        }

        response.writeHead(200, headers);
        response.end(result.audio);
        return true;
      }

      json(response, 404, {
        error: "API route not found."
      });
      return true;
    } catch (error) {
      if (isTranslationUnavailableError(error)) {
        json(response, 503, {
          error: error.code,
          message: error.message,
          provider: error.provider,
          retryable: error.retryable,
          fallbackAttempted: error.fallbackAttempted
        });
        return true;
      }

      if (isSpeechUnavailableError(error)) {
        json(response, 503, {
          error: error.code,
          message: error.message,
          provider: error.provider,
          retryable: error.retryable,
          fallbackAttempted: error.fallbackAttempted
        });
        return true;
      }

      json(response, 502, {
        error:
          error instanceof Error
            ? error.message
            : String(error)
      });
      return true;
    }
  };
}
