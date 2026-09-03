import test from "node:test";
import assert from "node:assert/strict";
import {
  BrowserSpeechController,
  BrowserSpeechUnavailableError,
  selectPersianVoice
} from "../extension/core/browser-speech.mjs";

test("prefers fa-IR and matching voice preference hints", () => {
  const voices = [
    { name: "English Female", lang: "en-US" },
    { name: "Persian Male", lang: "fa-IR" },
    { name: "Persian Female", lang: "fa-IR" },
    { name: "Persian Generic", lang: "fa" }
  ];

  assert.equal(selectPersianVoice(voices, "female").name, "Persian Female");
  assert.equal(selectPersianVoice(voices, "male").name, "Persian Male");
});

test("falls back to best Persian voice when gender is not encoded", () => {
  const voices = [
    { name: "Generic Persian", lang: "fa" },
    { name: "Iran Voice", lang: "fa-IR", localService: true }
  ];

  assert.equal(selectPersianVoice(voices, "female").name, "Iran Voice");
});

test("controller speaks, pauses, resumes, and cancels", async () => {
  const calls = [];
  let utterance;

  const synthesis = {
    getVoices() {
      return [{ name: "Iran Voice", lang: "fa-IR" }];
    },
    speak(value) {
      calls.push("speak");
      utterance = value;
      value.onstart?.();
    },
    pause() { calls.push("pause"); },
    resume() { calls.push("resume"); },
    cancel() { calls.push("cancel"); }
  };

  const controller = new BrowserSpeechController({
    synthesis,
    utteranceFactory: (text) => ({ text })
  });

  const result = await controller.speak({
    text: "سلام",
    voicePreference: "female"
  });

  assert.equal(result.voice.lang, "fa-IR");
  assert.equal(utterance.lang, "fa-IR");
  assert.equal(utterance.rate, 0.95);
  assert.equal(controller.active, true);

  assert.equal(controller.pause(), true);
  assert.equal(controller.paused, true);
  assert.equal(controller.resume(), true);
  assert.equal(controller.paused, false);

  controller.cancel();
  assert.equal(controller.active, false);
  assert.deepEqual(calls, ["cancel", "speak", "pause", "resume", "cancel"]);
});

test("controller reports missing Persian voice deterministically", async () => {
  const controller = new BrowserSpeechController({
    synthesis: {
      getVoices() {
        return [{ name: "English", lang: "en-US" }];
      },
      speak() {},
      cancel() {}
    },
    utteranceFactory: (text) => ({ text })
  });

  await assert.rejects(
    () => controller.speak({ text: "سلام" }),
    (error) => {
      assert.ok(error instanceof BrowserSpeechUnavailableError);
      assert.equal(error.code, "browser_persian_voice_unavailable");
      return true;
    }
  );
});
