import {
  MsEdgeTTS,
  OUTPUT_FORMAT
} from "msedge-tts";

export const EDGE_PERSIAN_VOICES = Object.freeze({
  female: Object.freeze({
    name: "fa-IR-DilaraNeural",
    gender: "Female",
    locale: "fa-IR"
  }),
  male: Object.freeze({
    name: "fa-IR-FaridNeural",
    gender: "Male",
    locale: "fa-IR"
  })
});

function assertText(text) {
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new TypeError("Speech text must be a non-empty string.");
  }
}

function escapeXml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function collectAudio(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let finished = false;

    function done() {
      if (finished) {
        return;
      }

      finished = true;
      resolve(Buffer.concat(chunks));
    }

    stream.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    stream.once("end", done);
    stream.once("close", done);
    stream.once("error", reject);
  });
}

export class EdgeSpeechSynthesizer {
  constructor({
    ttsFactory = () => new MsEdgeTTS()
  } = {}) {
    this.ttsFactory = ttsFactory;
  }

  async synthesize({
    text,
    voicePreference = "female"
  }) {
    assertText(text);

    const voice =
      EDGE_PERSIAN_VOICES[voicePreference];

    if (!voice) {
      throw new TypeError(
        `Unsupported voice preference: ${voicePreference}`
      );
    }

    const tts = this.ttsFactory();

    await tts.setMetadata(
      voice.name,
      OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS
    );

    const streamResult = await Promise.resolve(
      tts.toStream(escapeXml(text.trim()))
    );

    if (!streamResult?.audioStream) {
      throw new Error(
        "Edge Read Aloud returned no audio stream."
      );
    }

    const audio = await collectAudio(
      streamResult.audioStream
    );

    if (audio.byteLength < 100) {
      throw new Error(
        "Edge Read Aloud returned too little audio."
      );
    }

    return {
      audio,
      contentType: "audio/webm; codecs=opus",
      voice
    };
  }
}
