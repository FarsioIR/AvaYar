import {
  getFreeProviderConfig,
  getProviderCapabilities
} from "./config.mjs";
import {
  LocalM2M100Translator
} from "./providers/local-m2m100-translator.mjs";
import {
  EdgeSpeechSynthesizer
} from "./providers/edge-speech.mjs";
import {
  WebpageExtractor
} from "./extraction/webpage-extractor.mjs";

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
  ttsFactory,
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
        json(
          response,
          200,
          getProviderCapabilities(env)
        );
        return true;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/extract"
      ) {
        const body = await readJson(request);

        const extractor =
          webpageExtractorFactory
            ? webpageExtractorFactory()
            : new WebpageExtractor();

        const result =
          await extractor.extract(body.url);

        json(response, 200, result);
        return true;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/translate"
      ) {
        const body = await readJson(request);
        const config = getFreeProviderConfig(env);

        const translator =
          new LocalM2M100Translator({
            config: config.translation,
            pipelineFactory:
              translationPipelineFactory,
            languageDetector:
              translationLanguageDetector
          });

        const text =
          await translator.translateToPersian(
            body.text,
            {
              sourceLanguage:
                typeof body.sourceLanguage === "string"
                  ? body.sourceLanguage
                  : null
            }
          );

        json(response, 200, {
          text,
          to: "fa",
          provider: "local-m2m100"
        });
        return true;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/tts"
      ) {
        const body = await readJson(request);

        const synthesizer =
          new EdgeSpeechSynthesizer({
            ttsFactory
          });

        const result = await synthesizer.synthesize({
          text: body.text,
          voicePreference: body.voicePreference
        });

        response.writeHead(200, {
          "content-type": result.contentType,
          "cache-control": "no-store",
          "x-avayar-voice-name": result.voice.name,
          "x-avayar-voice-gender": result.voice.gender
        });
        response.end(result.audio);
        return true;
      }

      json(response, 404, {
        error: "API route not found."
      });
      return true;
    } catch (error) {
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
