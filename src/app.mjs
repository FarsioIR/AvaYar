import { prepareListening } from "./core/pipeline.mjs";
import { ServerTranslationProvider } from "./providers/server-translation.mjs";
import { createServerSpeaker } from "./providers/server-speech.mjs";

const elements = {
  pageUrl: document.querySelector("#pageUrl"),
  extractButton: document.querySelector("#extractButton"),
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
  providerBadge: document.querySelector("#providerBadge"),
  extractionBadge: document.querySelector("#extractionBadge")
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

    const translation =
      capabilities.translationConfigured
        ? "ترجمه محلی ✓"
        : "ترجمه —";

    const speech =
      capabilities.speechConfigured
        ? "صدای فارسی ✓"
        : "صدا —";

    elements.providerBadge.textContent =
      `Keyless: ${translation} / ${speech}`;
  } catch {
    elements.providerBadge.textContent =
      "Keyless: وضعیت نامشخص";
  }
}

function renderPrepared(result) {
  prepared = result;
  elements.outputText.textContent =
    result.listeningText;
  elements.outputText.classList.remove("empty");

  elements.languageBadge.textContent =
    result.sourceLanguage === "fa"
      ? `زبان: فارسی (${result.languageConfidence})`
      : `زبان: ترجمه‌شده به فارسی (${result.languageConfidence})`;

  setPlaybackEnabled(
    Boolean(capabilities?.speechConfigured)
  );

  const modeLabel =
    result.mode === "summary"
      ? "خلاصه"
      : "کامل";

  setStatus(
    capabilities?.speechConfigured
      ? `خروجی ${modeLabel} آماده پخش است.`
      : `خروجی ${modeLabel} آماده است؛ سرویس صدای فارسی در دسترس نیست.`
  );
}

async function prepare() {
  setStatus("در حال آماده‌سازی…");
  setPlaybackEnabled(false);

  try {
    const result = await prepareListening({
      text: elements.sourceText.value,
      mode: elements.mode.value,
      voicePreference:
        elements.voicePreference.value,
      translator
    });

    renderPrepared(result);
  } catch (error) {
    prepared = null;
    elements.outputText.textContent =
      "خروجی آماده نشد.";
    elements.outputText.classList.add("empty");
    elements.languageBadge.textContent =
      "زبان: —";

    setStatus(
      error instanceof Error
        ? error.message
        : String(error),
      true
    );
  }
}

async function extractPage() {
  const pageUrl = elements.pageUrl.value.trim();

  if (!pageUrl) {
    setStatus(
      "آدرس HTTPS صفحه را وارد کنید.",
      true
    );
    return;
  }

  elements.extractButton.disabled = true;
  setStatus(
    "در حال دریافت امن و استخراج محتوای اصلی صفحه…"
  );

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        url: pageUrl
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload.error ||
        "استخراج صفحه ناموفق بود."
      );
    }

    elements.sourceText.value = payload.text;

    const title =
      payload.title ||
      new URL(payload.url).hostname;

    elements.extractionBadge.textContent =
      `صفحه: ${title}`;

    if (payload.truncated) {
      setStatus(
        "محتوای اصلی استخراج شد؛ متن بسیار بلند تا سقف امن AvaYar کوتاه شد."
      );
    } else {
      setStatus(
        "محتوای اصلی صفحه استخراج شد؛ در حال آماده‌سازی خروجی فارسی…"
      );
    }

    await prepare();
  } catch (error) {
    elements.extractionBadge.textContent =
      "صفحه: —";

    setStatus(
      error instanceof Error
        ? error.message
        : String(error),
      true
    );
  } finally {
    elements.extractButton.disabled = false;
  }
}

elements.extractButton.addEventListener(
  "click",
  extractPage
);

elements.prepareButton.addEventListener(
  "click",
  prepare
);

elements.playButton.addEventListener(
  "click",
  async () => {
    if (!prepared) {
      return;
    }

    setStatus("در حال ساخت صدای فارسی…");

    try {
      const result = await speaker.speak({
        text: prepared.listeningText,
        rate: Number(elements.rate.value),
        voicePreference:
          elements.voicePreference.value
      });

      elements.voiceBadge.textContent =
        `صدا: ${result.voiceName} / ${result.voiceGender}`;

      setStatus(
        "پخش با صدای فارسی شروع شد."
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : String(error),
        true
      );
    }
  }
);

elements.pauseButton.addEventListener(
  "click",
  () => {
    speaker.pause();
    setStatus("پخش متوقف موقت شد.");
  }
);

elements.resumeButton.addEventListener(
  "click",
  async () => {
    await speaker.resume();
    setStatus("پخش ادامه یافت.");
  }
);

elements.stopButton.addEventListener(
  "click",
  () => {
    speaker.stop();
    setStatus("پخش متوقف شد.");
  }
);

elements.rate.addEventListener(
  "input",
  () => {
    const rate = Number(elements.rate.value);

    elements.rateValue.textContent =
      `${rate.toFixed(1)}×`;

    speaker.setRate(rate);
  }
);

elements.pageUrl.value =
  "https://example.com/";

elements.sourceText.value =
  "AvaYar can translate non-Persian text locally and synthesize Persian speech with explicit female and male voices.";

await loadCapabilities();
