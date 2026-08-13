import { getAzureConfig, getProviderCapabilities } from "./config.mjs";
import { AzureTranslator } from "./providers/azure-translator.mjs";
import { AzureSpeechSynthesizer } from "./providers/azure-speech.mjs";

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
  fetchImpl = globalThis.fetch
} = {}) {
  return async function handleApi(request, response) {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (!url.pathname.startsWith("/api/")) {
      return false;
    }

    try {
      if (request.method === "GET" && url.pathname === "/api/capabilities") {
        json(response, 200, getProviderCapabilities(env));
        return true;
      }

      if (request.method === "POST" && url.pathname === "/api/translate") {
        const body = await readJson(request);
        const config = getAzureConfig(env);

        const translator = new AzureTranslator({
          ...config.translator,
          fetchImpl
        });

        const text = await translator.translateToPersian(body.text);

        json(response, 200, {
          text,
          to: "fa",
          provider: "azure"
        });
        return true;
      }

      if (request.method === "POST" && url.pathname === "/api/tts") {
        const body = await readJson(request);
        const config = getAzureConfig(env);

        const synthesizer = new AzureSpeechSynthesizer({
          ...config.speech,
          fetchImpl
        });

        const result = await synthesizer.synthesize({
          text: body.text,
          voicePreference: body.voicePreference
        });

        response.writeHead(200, {
          "content-type": result.contentType,
          "cache-control": "no-store",
          "x-ava-voice-name": result.voice.name,
          "x-ava-voice-gender": result.voice.gender
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
        error: error instanceof Error ? error.message : String(error)
      });
      return true;
    }
  };
}
