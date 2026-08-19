import {
  mkdir,
  writeFile
} from "node:fs/promises";
import {
  resolve
} from "node:path";
import {
  getProviderConfig
} from "../server/config.mjs";
import {
  GeminiPersianSpeechSynthesizer
} from "../server/providers/gemini-speech.mjs";

const config = getProviderConfig();

if (!config.speech.apiKey) {
  throw new Error(
    "GEMINI_API_KEY is required for the live Gemini speech probe."
  );
}

const synthesizer = new GeminiPersianSpeechSynthesizer({
  apiKey: config.speech.apiKey,
  model: config.speech.model,
  voices: config.speech.voices
});

const text = [
  "آوایار باید متن فارسی را روان، طبیعی و با تلفظ معیار ایرانی بخواند.",
  "بعد از پایان جمله و رفتن به خط بعد، یک مکث طبیعی لازم است.",
  "",
  "این پاراگراف جدید باید با مکثی کمی بلندتر آغاز شود."
].join("\n");

const sampleDir =
  process.env.AVAYAR_M5_SAMPLE_DIR
    ? resolve(process.env.AVAYAR_M5_SAMPLE_DIR)
    : null;

if (sampleDir) {
  await mkdir(sampleDir, { recursive: true });
}

for (const preference of ["female", "male"]) {
  const result = await synthesizer.synthesize({
    text,
    voicePreference: preference
  });

  if (
    result.audio.byteLength < 1000 ||
    result.audio.subarray(0, 4).toString("ascii") !== "RIFF"
  ) {
    throw new Error(
      `Live ${preference} Gemini TTS returned invalid WAV audio.`
    );
  }

  if (sampleDir) {
    const path = resolve(
      sampleDir,
      `${preference}-${result.voice.name}.wav`
    );
    await writeFile(path, result.audio);
    console.log(`${preference} sample: ${path}`);
  }

  console.log(
    `${preference} Gemini TTS PASS: ` +
      `${result.voice.name} / ${result.voice.locale} / ` +
      `${result.audio.byteLength} bytes / ${result.chunkCount} chunk(s)`
  );
}

console.log(
  "GEMINI IRANIAN PERSIAN SPEECH LIVE PROBE PASS"
);
