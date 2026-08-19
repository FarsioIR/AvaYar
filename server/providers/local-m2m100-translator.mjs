import { homedir } from "node:os";
import { join } from "node:path";
import { franc } from "franc-min";
import {
  env as transformersEnv,
  pipeline
} from "@huggingface/transformers";

const PERSIAN_SCRIPT = /[\u0600-\u06ff]/u;

const FRANC_TO_M2M = Object.freeze({
  arb: "ar",
  ben: "bn",
  ces: "cs",
  cmn: "zh",
  dan: "da",
  deu: "de",
  ell: "el",
  eng: "en",
  fin: "fi",
  fra: "fr",
  heb: "he",
  hin: "hi",
  hun: "hu",
  ind: "id",
  ita: "it",
  jpn: "ja",
  kor: "ko",
  nld: "nl",
  pol: "pl",
  por: "pt",
  ron: "ro",
  rus: "ru",
  spa: "es",
  swe: "sv",
  tur: "tr",
  ukr: "uk",
  urd: "ur",
  vie: "vi"
});

const DETECTABLE_LANGUAGES = Object.freeze(
  Object.keys(FRANC_TO_M2M)
);

let sharedPipeline = null;
let sharedPipelineKey = "";

function assertText(text) {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new TypeError("Translation text must be a non-empty string.");
  }
}

function resolveCacheDir(config) {
  return (
    config.cacheDir ??
    join(homedir(), ".cache", "avayar", "transformers")
  );
}

export function detectSourceLanguage(
  text,
  fallback = "en"
) {
  assertText(text);

  if (text.length < 20) {
    return fallback;
  }

  const detected = franc(text, {
    only: DETECTABLE_LANGUAGES,
    minLength: 10
  });

  return FRANC_TO_M2M[detected] ?? fallback;
}

function splitForTranslation(text, maxChars = 1200) {
  const normalized = text.trim();

  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const units = normalized
    .split(/(?<=[.!?؟。！？])\s+|\n{2,}/u)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  function flush() {
    if (current) {
      chunks.push(current);
      current = "";
    }
  }

  for (const unit of units) {
    if (unit.length > maxChars) {
      flush();

      for (let start = 0; start < unit.length; start += maxChars) {
        chunks.push(unit.slice(start, start + maxChars));
      }

      continue;
    }

    const candidate = current ? `${current} ${unit}` : unit;

    if (candidate.length > maxChars) {
      flush();
      current = unit;
    } else {
      current = candidate;
    }
  }

  flush();
  return chunks;
}

async function loadSharedPipeline(config) {
  const cacheDir = resolveCacheDir(config);
  const key =
    `${config.model}|${config.dtype}|${cacheDir}`;

  if (!sharedPipeline || sharedPipelineKey !== key) {
    transformersEnv.cacheDir = cacheDir;
    transformersEnv.allowRemoteModels = true;

    sharedPipelineKey = key;
    sharedPipeline = await pipeline(
      "translation",
      config.model,
      {
        dtype: config.dtype
      }
    );
  }

  return sharedPipeline;
}

export class LocalM2M100Translator {
  constructor({
    config,
    pipelineFactory = loadSharedPipeline,
    languageDetector = detectSourceLanguage
  } = {}) {
    if (!config) {
      throw new TypeError("Translation provider config is required.");
    }

    this.config = config;
    this.pipelineFactory = pipelineFactory;
    this.languageDetector = languageDetector;
  }

  async translateToPersian(
    text,
    { sourceLanguage = null } = {}
  ) {
    assertText(text);

    const input = text.trim();

    const source =
      sourceLanguage ??
      this.languageDetector(
        input,
        this.config.defaultSourceLanguage
      );

    if (source === "fa") {
      return input;
    }

    const translator =
      await this.pipelineFactory(this.config);

    const translatedChunks = [];

    for (const chunk of splitForTranslation(input)) {
      const output = await translator(chunk, {
        src_lang: source,
        tgt_lang: "fa"
      });

      const translated =
        output?.[0]?.translation_text;

      if (
        typeof translated !== "string" ||
        translated.trim().length === 0
      ) {
        throw new Error(
          "Local M2M100 translation returned no Persian text."
        );
      }

      translatedChunks.push(translated.trim());
    }

    const result = translatedChunks.join(" ");

    if (!PERSIAN_SCRIPT.test(result)) {
      throw new Error(
        "Local M2M100 translation did not return Persian-script text."
      );
    }

    return result;
  }
}
