import { prepareListening } from "./core/pipeline.mjs";
import { ServerTranslationProvider } from "./providers/server-translation.mjs";
import { createServerSpeaker } from "./providers/server-speech.mjs";

const elements = {
  sourceText: document.querySelector("#sourceText"),
  mode: document.querySelector("#mode"),
  voicePreference: document.querySelector("#voicePreference"),
  rate: document.querySelector("#rate"),
  rateValue: document.querySelector("#rateValue"),
  prepareButton: document.querySelector("#prepareButton"),
  playButton: document.querySelector("#playButton"),
  pauseButton: document.querySelector("#pauseButton"),
  resumeButton: document.querySelector("#resumeButton"),
  stopButton: document.querySelector("#stopButton"),
  status: document.querySelector("#status"),
  outputText: document.querySelector("#outputText"),
  languageBadge: document.querySelector("#languageBadge"),
  voiceBadge: document.querySelector("#voiceBadge"),
  providerBadge: document.querySelector("#providerBadge")
};

const translator = new ServerTranslationProvider();
const speaker = createServerSpeaker();
let prepared = null;
let capabilities = null;

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function setPlaybackEnabled(enabled) {
  elements.playButton.disabled = !enabled;
  elements.pauseButton.disabled = !enabled;
  elements.resumeButton.disabled = !enabled;
  elements.stopButton.disabled = !enabled;
}

async function loadCapabilities() {
  try {
    const response = await fetch("/api/capabilities");
    capabilities = await response.json();

    const translation = capabilities.translationConfigured ? "ترجمه ✓" : "ترجمه —";
    const speech = capabilities.speechConfigured ? "صدا ✓" : "صدا —";
    elements.providerBadge.textContent = `Azure: ${translation} / ${speech}`;
  } catch {
    elements.providerBadge.textContent = "Azure: وضعیت نامشخص";
  }
}

function renderPrepared(result) {
  prepared = result;
  elements.outputText.textContent = result.listeningText;
  elements.outputText.classList.remove("empty");
  elements.languageBadge.textContent =
    result.sourceLanguage === "fa"
      ? `زبان: فارسی (${result.languageConfidence})`
      : `زبان: ترجمه‌شده به فارسی (${result.languageConfidence})`;
  setPlaybackEnabled(Boolean(capabilities?.speechConfigured));

  const modeLabel = result.mode === "summary" ? "خلاصه" : "کامل";
  setStatus(
    capabilities?.speechConfigured
      ? `خروجی ${modeLabel} آماده پخش است.`
      : `خروجی ${modeLabel} آماده است؛ Azure Speech هنوز تنظیم نشده است.`
  );
}

async function prepare() {
  setStatus("در حال آماده‌سازی…");
  setPlaybackEnabled(false);

  try {
    const result = await prepareListening({
      text: elements.sourceText.value,
      mode: elements.mode.value,
      voicePreference: elements.voicePreference.value,
      translator
    });

    renderPrepared(result);
  } catch (error) {
    prepared = null;
    elements.outputText.textContent = "خروجی آماده نشد.";
    elements.outputText.classList.add("empty");
    elements.languageBadge.textContent = "زبان: —";
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
}

elements.prepareButton.addEventListener("click", prepare);

elements.playButton.addEventListener("click", async () => {
  if (!prepared) {
    return;
  }

  setStatus("در حال ساخت صدای فارسی…");

  try {
    const result = await speaker.speak({
      text: prepared.listeningText,
      rate: Number(elements.rate.value),
      voicePreference: elements.voicePreference.value
    });

    elements.voiceBadge.textContent =
      `صدا: ${result.voiceName} / ${result.voiceGender}`;

    setStatus("پخش با صدای فارسی Azure شروع شد.");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
});

elements.pauseButton.addEventListener("click", () => {
  speaker.pause();
  setStatus("پخش متوقف موقت شد.");
});

elements.resumeButton.addEventListener("click", async () => {
  await speaker.resume();
  setStatus("پخش ادامه یافت.");
});

elements.stopButton.addEventListener("click", () => {
  speaker.stop();
  setStatus("پخش متوقف شد.");
});

elements.rate.addEventListener("input", () => {
  const rate = Number(elements.rate.value);
  elements.rateValue.textContent = `${rate.toFixed(1)}×`;
  speaker.setRate(rate);
});

elements.sourceText.value =
  "Ava can now translate non-Persian text to Persian through Azure Translator. " +
  "It can also synthesize Persian speech using explicit female and male Azure voices.";

await loadCapabilities();
