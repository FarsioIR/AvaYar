import test from "node:test";
import assert from "node:assert/strict";
import { splitSentences, summarizePersian } from "../src/core/summary.mjs";

test("splits Persian sentences", () => {
  const sentences = splitSentences(
    "جمله اول مهم است. جمله دوم هم مهم است. جمله سوم برای تست است."
  );

  assert.equal(sentences.length, 3);
});

test("summary is shorter than a multi-sentence source", () => {
  const source =
    "هوش مصنوعی ابزارهای تازه‌ای ایجاد کرده است. " +
    "این ابزارها برای پردازش متن استفاده می‌شوند. " +
    "پردازش متن در آوا اهمیت زیادی دارد. " +
    "آوا متن فارسی را برای شنیدن آماده می‌کند. " +
    "کاربر می‌تواند نسخه کامل یا خلاصه را انتخاب کند.";

  const summary = summarizePersian(source);

  assert.ok(summary.length > 0);
  assert.ok(summary.length < source.length);
});
