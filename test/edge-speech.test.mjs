import { Readable } from "node:stream";
import test from "node:test";
import assert from "node:assert/strict";
import {
  EdgeSpeechSynthesizer,
  EDGE_PERSIAN_VOICES
} from "../server/providers/edge-speech.mjs";

function createFakeTts(calls) {
  return {
    async setMetadata(voice, format) {
      calls.push({
        type: "metadata",
        voice,
        format
      });
    },

    toStream(text) {
      calls.push({
        type: "stream",
        text
      });

      return {
        audioStream: Readable.from([
          Buffer.alloc(256, 7)
        ])
      };
    }
  };
}

for (const preference of ["female", "male"]) {
  test(
    `${preference} selection uses exact Persian voice`,
    async () => {
      const calls = [];

      const synthesizer =
        new EdgeSpeechSynthesizer({
          ttsFactory: () =>
            createFakeTts(calls)
        });

      const result =
        await synthesizer.synthesize({
          text: "آزمایش <امن> & فارسی",
          voicePreference: preference
        });

      assert.equal(
        result.voice.name,
        EDGE_PERSIAN_VOICES[preference].name
      );
      assert.equal(
        result.voice.gender,
        EDGE_PERSIAN_VOICES[preference].gender
      );
      assert.equal(
        calls[0].voice,
        EDGE_PERSIAN_VOICES[preference].name
      );
      assert.match(
        calls[1].text,
        /&lt;امن&gt; &amp;/u
      );
      assert.ok(result.audio.byteLength >= 100);
    }
  );
}
