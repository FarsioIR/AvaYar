import test from "node:test";
import assert from "node:assert/strict";

import {
  GeminiPersianTranslator
} from "../server/providers/gemini-translation.mjs";

test(
  "Gemini production translator returns Persian text",
  async () => {
    const calls = [];

    const translator =
      new GeminiPersianTranslator({
        apiKey:
          "test-key-abcdefghijklmnopqrstuvwxyz",
        clientFactory:
          () => ({
            models: {
              async generateContent(request) {
                calls.push(request);

                return {
                  text:
                    "این یک ترجمه فارسی است."
                };
              }
            }
          })
      });

    const result =
      await translator.translateToPersian(
        "This is a translation test."
      );

    assert.equal(
      result,
      "این یک ترجمه فارسی است."
    );

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].model,
      "gemini-flash-latest"
    );

    assert.match(
      calls[0]
        .contents[0]
        .parts[0]
        .text,
      /Iranian Persian/u
    );
  }
);

test(
  "Persian input bypasses Gemini translation",
  async () => {
    let calls = 0;

    const translator =
      new GeminiPersianTranslator({
        apiKey:
          "test-key-abcdefghijklmnopqrstuvwxyz",
        clientFactory:
          () => ({
            models: {
              async generateContent() {
                calls += 1;
                throw new Error(
                  "must not execute"
                );
              }
            }
          })
      });

    const result =
      await translator.translateToPersian(
        "این متن فارسی است."
      );

    assert.equal(
      result,
      "این متن فارسی است."
    );

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "Gemini translation rejects non-Persian output",
  async () => {
    const translator =
      new GeminiPersianTranslator({
        apiKey:
          "test-key-abcdefghijklmnopqrstuvwxyz",
        clientFactory:
          () => ({
            models: {
              async generateContent() {
                return {
                  text:
                    "No translation available"
                };
              }
            }
          })
      });

    await assert.rejects(
      () =>
        translator.translateToPersian(
          "Translate this."
        ),
      /no Persian text/u
    );
  }
);
