import test from "node:test";
import assert from "node:assert/strict";
import { detectLanguage } from "../src/core/language.mjs";

test("detects Persian-like text", () => {
  const result = detectLanguage("این یک متن فارسی برای تست آوا است.");
  assert.equal(result.code, "fa");
  assert.ok(result.confidence > 0.5);
});

test("detects Latin text as non-Persian", () => {
  const result = detectLanguage("This is an English article about technology.");
  assert.equal(result.code, "non-fa");
});
