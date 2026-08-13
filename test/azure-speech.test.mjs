import test from "node:test";
import assert from "node:assert/strict";
import {
  AzureSpeechSynthesizer,
  AZURE_PERSIAN_VOICES
} from "../server/providers/azure-speech.mjs";

test("female selection uses Dilara exact Persian voice", async () => {
  let body = null;

  const synth = new AzureSpeechSynthesizer({
    key: "speech-key",
    region: "westeurope",
    fetchImpl: async (_url, options) => {
      body = options.body;

      return new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: {
          "content-type": "audio/mpeg"
        }
      });
    }
  });

  const result = await synth.synthesize({
    text: "سلام آوا",
    voicePreference: "female"
  });

  assert.equal(result.voice.name, AZURE_PERSIAN_VOICES.female.name);
  assert.match(body, /fa-IR-DilaraNeural/u);
  assert.match(body, /xml:gender="Female"/u);
  assert.equal(result.audio.byteLength, 4);
});

test("male selection uses Farid exact Persian voice and escapes SSML", async () => {
  let body = null;

  const synth = new AzureSpeechSynthesizer({
    key: "speech-key",
    region: "westeurope",
    fetchImpl: async (_url, options) => {
      body = options.body;

      return new Response(new Uint8Array([5, 6, 7]), {
        status: 200
      });
    }
  });

  const result = await synth.synthesize({
    text: "آوا < تست & امن >",
    voicePreference: "male"
  });

  assert.equal(result.voice.name, AZURE_PERSIAN_VOICES.male.name);
  assert.match(body, /fa-IR-FaridNeural/u);
  assert.match(body, /xml:gender="Male"/u);
  assert.match(body, /&lt; تست &amp; امن &gt;/u);
});
