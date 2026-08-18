import { getAzureConfig } from "../server/config.mjs";
import { AzureTranslator } from "../server/providers/azure-translator.mjs";
import {
  AzureSpeechSynthesizer,
  AZURE_PERSIAN_VOICES
} from "../server/providers/azure-speech.mjs";

const config = getAzureConfig();

if (!config.translator.key) {
  throw new Error("AZURE_TRANSLATOR_KEY is required for the live M3 probe.");
}

if (!config.speech.key || !config.speech.region) {
  throw new Error(
    "AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are required for the live M3 probe."
  );
}

const translator = new AzureTranslator(config.translator);
const speech = new AzureSpeechSynthesizer(config.speech);

const translated = await translator.translateToPersian(
  "AvaYar converts useful text into a Persian listening experience."
);

if (!/[\u0600-\u06ff]/u.test(translated)) {
  throw new Error(`Live translation did not return Persian-script text: ${translated}`);
}

console.log(`Translation PASS: ${translated}`);

for (const voicePreference of ["female", "male"]) {
  const result = await speech.synthesize({
    text: "این یک آزمون زنده برای صدای فارسی آوا است.",
    voicePreference
  });

  if (result.audio.byteLength < 100) {
    throw new Error(`Live ${voicePreference} TTS returned too little audio.`);
  }

  const expected = AZURE_PERSIAN_VOICES[voicePreference].name;

  if (result.voice.name !== expected) {
    throw new Error(
      `Voice mismatch for ${voicePreference}: expected ${expected}, got ${result.voice.name}`
    );
  }

  console.log(
    `${voicePreference} TTS PASS: ${result.voice.name} / ${result.audio.byteLength} bytes`
  );
}

console.log("AZURE LIVE PROVIDER PROBE PASS");
