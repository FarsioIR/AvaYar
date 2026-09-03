import test from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare/worker.mjs";

function request(path, options = {}) {
  return new Request(`https://avayar.test${path}`, options);
}

test("health exposes edge translation and browser speech capabilities", async () => {
  const response = await worker.fetch(request("/health"), {});
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.status, "ready");
  assert.equal(body.capabilities.translation, "cloudflare-workers-ai");
  assert.equal(body.capabilities.speech, "browser-fallback");
});

test("Persian translation input passes through without AI", async () => {
  const response = await worker.fetch(
    request("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "سلام از آوایار" })
    }),
    {}
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.text, "سلام از آوایار");
  assert.equal(body.provider, "passthrough-fa");
});

test("English translation uses Cloudflare M2M100 and returns Persian", async () => {
  let call = null;
  const env = {
    AI: {
      async run(model, input) {
        call = { model, input };
        return { translated_text: "فناوری به مردم کمک می‌کند." };
      }
    }
  };

  const response = await worker.fetch(
    request("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Technology helps people." })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.provider, "cloudflare-m2m100");
  assert.match(body.text, /[\u0600-\u06ff]/u);
  assert.deepEqual(call, {
    model: "@cf/meta/m2m100-1.2b",
    input: {
      text: "Technology helps people.",
      source_lang: "en",
      target_lang: "fa"
    }
  });
});

test("translation failures are sanitized", async () => {
  const env = {
    AI: {
      async run() {
        const error = new Error("provider secret detail");
        error.status = 503;
        throw error;
      }
    }
  };

  const response = await worker.fetch(
    request("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "English text" })
    }),
    env
  );
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.code, "AVAYAR_TRANSLATION_UNAVAILABLE");
  assert.doesNotMatch(JSON.stringify(body), /provider secret detail/u);
});

test("TTS route deterministically requests browser fallback", async () => {
  const response = await worker.fetch(
    request("/api/tts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "سلام", voicePreference: "female" })
    }),
    {}
  );
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.code, "AVAYAR_SPEECH_BROWSER_FALLBACK_REQUIRED");
  assert.equal(body.retryable, true);
  assert.equal(response.headers.get("retry-after"), "60");
});
