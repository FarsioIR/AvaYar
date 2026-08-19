import test from "node:test";
import assert from "node:assert/strict";
import {
  LocalM2M100Translator,
  detectSourceLanguage
} from "../server/providers/local-m2m100-translator.mjs";

test(
  "local translator targets Persian without API credentials",
  async () => {
    const calls = [];

    const provider =
      new LocalM2M100Translator({
        config: {
          model: "Xenova/m2m100_418M",
          dtype: "q8",
          defaultSourceLanguage: "en",
          cacheDir: null
        },
        pipelineFactory: async () =>
          async (text, options) => {
            calls.push({ text, options });
            return [
              {
                translation_text:
                  "این یک ترجمه فارسی آزمایشی است."
              }
            ];
          },
        languageDetector: () => "en"
      });

    const result =
      await provider.translateToPersian(
        "This is a translation contract test."
      );

    assert.match(result, /[\u0600-\u06ff]/u);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.src_lang, "en");
    assert.equal(calls[0].options.tgt_lang, "fa");
  }
);

test(
  "short uncertain text falls back to configured source language",
  () => {
    assert.equal(
      detectSourceLanguage("hello", "en"),
      "en"
    );
  }
);
