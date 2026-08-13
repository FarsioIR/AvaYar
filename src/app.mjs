import { prepareListening } from "./core/pipeline.mjs";
import { createBrowserSpeaker } from "./providers/browser-speech.mjs";
import { UnconfiguredTranslationProvider } from "./providers/unconfigured-translation.mjs";

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
  voiceBadge: document.querySelector("#voiceBadge")
};

const translator = new UnconfiguredTranslationProvider();
const speaker = createBrowserSpeaker();
let prepared = null;

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

function renderPrepared(result) {
  prepared = result;
  elements.outputText.textContent = result.listeningText;
  elements.outputText.classList.remove("empty");
  elements.languageBadge.textContent =
    result.sourceLanguage === "fa"
      ? `زبان: فارسی (${result.languageConfidence})`
      : `زبان: غیر فارسی (${result.languageConfidence})`;
  setPlaybackEnabled(true);

  const modeLabel = result.mode === "summary" ? "خلاصه" : "کامل";
  setStatus(`خروجی ${modeLabel} آماده است.`);
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

elements.playButton.addEventListener("click", () => {
  if (!prepared) {
    return;
  }

  try {
    const result = speaker.speak({
      text: prepared.listeningText,
      rate: Number(elements.rate.value),
      voicePreference: elements.voicePreference.value
    });

    elements.voiceBadge.textContent = `صدا: ${result.voiceName}`;
    setStatus(
      result.exactGenderGuaranteed
        ? "پخش شروع شد."
        : "پخش شروع شد؛ جنسیت صدای مرورگر تضمین‌شده نیست."
    );
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
});

elements.pauseButton.addEventListener("click", () => {
  speaker.pause();
  setStatus("پخش متوقف موقت شد.");
});

elements.resumeButton.addEventListener("click", () => {
  speaker.resume();
  setStatus("پخش ادامه یافت.");
});

elements.stopButton.addEventListener("click", () => {
  speaker.stop();
  setStatus("پخش متوقف شد.");
});

elements.rate.addEventListener("input", () => {
  elements.rateValue.textContent = `${Number(elements.rate.value).toFixed(1)}×`;
});

elements.sourceText.value =
  "آوا به شما کمک می‌کند متن‌های فارسی را به تجربه شنیداری تبدیل کنید. " +
  "در این نسخه پایه، متن فارسی می‌تواند به شکل کامل یا خلاصه آماده شود. " +
  "کنترل سرعت پخش و انتخاب صدای ترجیحی نیز در رابط کاربری وجود دارد. " +
  "اتصال ترجمه و صدای تضمین‌شده زن و مرد در milestone بعدی انجام می‌شود.";
