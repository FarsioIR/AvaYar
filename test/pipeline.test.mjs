import test from "node:test";
import assert from "node:assert/strict";
import { prepareListening } from "../src/core/pipeline.mjs";

test("Persian full mode does not call translator", async () => {
  let translatorCalled = false;

  const result = await prepareListening({
    text: "این متن فارسی است و باید بدون ترجمه عبور کند.",
    mode: "full",
    voicePreference: "female",
    translator: {
      async translateToPersian() {
        translatorCalled = true;
        return "نباید اجرا شود";
      }
    }
  });

  assert.equal(translatorCalled, false);
  assert.equal(result.sourceLanguage, "fa");
  assert.equal(result.translated, false);
  assert.equal(result.listeningText, result.persianText);
});

test("non-Persian input uses injected translator", async () => {
  let received = null;

  const result = await prepareListening({
    text: "A short English article.",
    mode: "full",
    voicePreference: "male",
    translator: {
      async translateToPersian(text) {
        received = text;
        return "این ترجمه فارسی آزمایشی است.";
      }
    }
  });

  assert.equal(received, "A short English article.");
  assert.equal(result.sourceLanguage, "non-fa");
  assert.equal(result.translated, true);
  assert.equal(result.listeningText, "این ترجمه فارسی آزمایشی است.");
});

test("summary mode applies after translation", async () => {
  const translated =
    "فناوری به سرعت تغییر می‌کند. " +
    "هوش مصنوعی بخشی از این تغییر است. " +
    "آوا از متن برای ساخت تجربه شنیداری استفاده می‌کند. " +
    "کاربر می‌تواند خلاصه را انتخاب کند.";

  const result = await prepareListening({
    text: "English source",
    mode: "summary",
    voicePreference: "female",
    translator: {
      async translateToPersian() {
        return translated;
      }
    }
  });

  assert.equal(result.translated, true);
  assert.ok(result.listeningText.length < translated.length);
});
