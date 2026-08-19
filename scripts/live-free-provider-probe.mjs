import {
  getFreeProviderConfig
} from "../server/config.mjs";
import {
  LocalM2M100Translator
} from "../server/providers/local-m2m100-translator.mjs";
import {
  EdgeSpeechSynthesizer,
  EDGE_PERSIAN_VOICES
} from "../server/providers/edge-speech.mjs";

const config = getFreeProviderConfig();

console.log(
  `Translation model: ${config.translation.model} / ${config.translation.dtype}`
);
console.log("API/account/key requirement: NONE");

const translator =
  new LocalM2M100Translator({
    config: config.translation
  });

const translated =
  await translator.translateToPersian(
    "AvaYar converts useful web content into a clear Persian listening experience.",
    {
      sourceLanguage: "en"
    }
  );

if (!/[\u0600-\u06ff]/u.test(translated)) {
  throw new Error(
    "Live local translation did not return Persian-script text."
  );
}

console.log(
  `Translation PASS: local M2M100 -> fa / ${translated.length} chars`
);

const speech =
  new EdgeSpeechSynthesizer();

for (const voicePreference of [
  "female",
  "male"
]) {
  const result = await speech.synthesize({
    text:
      "این یک آزمون زنده و بدون کلید برای صدای فارسی آوایار است.",
    voicePreference
  });

  const expected =
    EDGE_PERSIAN_VOICES[voicePreference].name;

  if (result.voice.name !== expected) {
    throw new Error(
      `Voice mismatch for ${voicePreference}: expected ${expected}, got ${result.voice.name}`
    );
  }

  if (result.audio.byteLength < 100) {
    throw new Error(
      `Live ${voicePreference} TTS returned too little audio.`
    );
  }

  console.log(
    `${voicePreference} TTS PASS: ${result.voice.name} / ${result.audio.byteLength} bytes`
  );
}

console.log(
  "FREE KEYLESS PROVIDER LIVE PROBE PASS"
);
