import { summarizePersian } from "./core/summary.mjs";
import { cleanArticleText } from "./core/content-cleaner.mjs";
import { BrowserSpeechController } from "./core/browser-speech.mjs";

const elements = {
  extract: document.querySelector("#extract"),
  mode: document.querySelector("#mode"),
  voice: document.querySelector("#voice"),
  status: document.querySelector("#status"),
  title: document.querySelector("#title"),
  modeBadge: document.querySelector("#modeBadge"),
  output: document.querySelector("#output"),
  play: document.querySelector("#play"),
  pause: document.querySelector("#pause"),
  stop: document.querySelector("#stop"),
  audio: document.querySelector("#audio")
};

const browserSpeech = new BrowserSpeechController({
  synthesis: globalThis.speechSynthesis,
  utteranceFactory:
    typeof globalThis.SpeechSynthesisUtterance === "function"
      ? (text) => new globalThis.SpeechSynthesisUtterance(text)
      : null
});

const AUDIO_REQUEST_TIMEOUT_MS = 90000;
const PLAYBACK_CHUNK_CHARS = 900;

let sourcePersianText = "";
let preparedText = "";
let audioUrl = null;
let busy = false;
let playbackMode = "none";
let playbackChunks = [];
let playbackChunkIndex = 0;
let playbackStopped = false;
let playbackGeneration = 0;

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

function setBusy(value, message) {
  busy = value;
  elements.extract.disabled = value;
  elements.mode.disabled = value;
  elements.voice.disabled = value;
  if (message) setStatus(message);
}

function idlePlaybackControls(message = null) {
  elements.play.disabled = !preparedText;
  elements.play.textContent = "پخش";
  elements.pause.disabled = true;
  elements.stop.disabled = true;
  if (message) setStatus(message);
}

function revokeAudio() {
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }
  elements.audio.removeAttribute("src");
  elements.audio.load();
}

function resetPlayback() {
  playbackGeneration += 1;
  playbackStopped = true;
  playbackChunks = [];
  playbackChunkIndex = 0;
  browserSpeech.cancel();
  if (!elements.audio.paused) elements.audio.pause();
  revokeAudio();
  playbackMode = "none";
  idlePlaybackControls();
}

async function api(message) {
  const response = await chrome.runtime.sendMessage({ target: "avayar-api", ...message });
  if (!response?.ok) {
    throw new Error(response?.error || "ارتباط با آوایار برقرار نشد.");
  }
  return response.result;
}

function resolveRuntimeApiBaseFromManifest() {
  const permissions = chrome.runtime.getManifest().host_permissions || [];
  for (const pattern of permissions) {
    if (typeof pattern !== "string" || !pattern.startsWith("https://")) continue;
    try {
      const url = new URL(pattern.replace(/\*+$/u, ""));
      if (url.hostname.endsWith("workers.dev")) return url.origin;
    } catch {
      // Ignore malformed host-permission entries.
    }
  }
  throw new Error("نسخه آوایار به سرویس صوتی آنلاین متصل نشده است.");
}

function splitPlaybackText(text) {
  const chunks = [];
  let remaining = String(text || "").trim();
  while (remaining.length > PLAYBACK_CHUNK_CHARS) {
    const window = remaining.slice(0, PLAYBACK_CHUNK_CHARS + 1);
    const markers = ["\n\n", "؟", ".", "!", "؛", "،", " "];
    let cut = -1;
    for (const marker of markers) {
      const index = window.lastIndexOf(marker);
      if (index >= Math.floor(PLAYBACK_CHUNK_CHARS * 0.55)) {
        cut = Math.max(cut, index + marker.length);
      }
    }
    if (cut <= 0) cut = PLAYBACK_CHUNK_CHARS;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks.filter(Boolean);
}

async function fetchServerAudio({ text, voicePreference }) {
  const apiBase = resolveRuntimeApiBaseFromManifest();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUDIO_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${apiBase}/api/tts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, voicePreference }),
      signal: controller.signal
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error("ظرفیت سرویس صدا موقتاً تکمیل است. کمی بعد دوباره تلاش کنید.");
      }
      throw new Error(errorBody?.error || "سرویس صدای آوایار موقتاً در دسترس نیست.");
    }
    const blob = await response.blob();
    if (!blob.size) throw new Error("فایل صدای آوایار خالی دریافت شد.");
    return blob;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("آماده‌سازی این بخش صدا بیش از حد طول کشید. دوباره تلاش کن.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function currentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) throw new Error("صفحه فعال پیدا نشد.");
  return tab;
}

async function ensurePageAccess(tab) {
  if (!tab.url) throw new Error("آدرس صفحه در دسترس نیست.");
  const url = new URL(tab.url);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("آوایار فقط روی صفحات وب قابل استفاده است.");
  }
  const originPattern = `${url.origin}/*`;
  if (await chrome.permissions.contains({ origins: [originPattern] })) return;
  const granted = await chrome.permissions.request({ origins: [originPattern] });
  if (!granted) {
    throw new Error("برای خواندن این صفحه باید دسترسی آن را به آوایار بدهی.");
  }
}

function renderParagraphs(text) {
  const fragment = document.createDocumentFragment();
  const paragraphs = String(text || "").split(/\n{2,}/u).map((v) => v.trim()).filter(Boolean);
  for (const value of paragraphs) {
    const paragraph = document.createElement("p");
    paragraph.textContent = value;
    fragment.append(paragraph);
  }
  elements.output.replaceChildren(fragment);
}

function renderCurrentMode() {
  if (!sourcePersianText) return;
  resetPlayback();
  if (elements.mode.value === "summary") {
    preparedText = summarizePersian(sourcePersianText).trim();
    elements.modeBadge.textContent = "خلاصه";
    renderParagraphs(preparedText);
    setStatus("خلاصه فارسی آماده پخش است.");
  } else {
    preparedText = sourcePersianText.trim();
    elements.modeBadge.textContent = "متن کامل";
    renderParagraphs(preparedText);
    setStatus("متن کامل فارسی آماده پخش است.");
  }
  elements.play.disabled = !preparedText;
}

async function extract() {
  setBusy(true, "در حال خواندن محتوای اصلی صفحه…");
  resetPlayback();
  try {
    const tab = await currentTab();
    await ensurePageAccess(tab);
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["readability.js", "content-script.mjs"]
    });
    const extracted = await chrome.tabs.sendMessage(tab.id, { type: "AVAYAR_EXTRACT" });
    if (!extracted?.ok) {
      throw new Error(extracted?.error || "متن اصلی این صفحه قابل استخراج نبود.");
    }
    elements.title.textContent = extracted.result.title || "صفحه بدون عنوان";
    const source = cleanArticleText(extracted.result.text);
    if (!source || source.length < 100) {
      throw new Error("محتوای اصلی کافی برای خواندن پیدا نشد.");
    }
    let persianText = source;
    if (!/[\u0600-\u06ff]/u.test(persianText)) {
      setStatus("متن انگلیسی شناسایی شد؛ در حال آماده‌سازی نسخه فارسی…");
      const translated = await api({ path: "/api/translate", body: { text: persianText } });
      persianText = cleanArticleText(translated.text);
    }
    if (!persianText || persianText.length < 100) {
      throw new Error("نسخه فارسی آماده‌شده کافی نیست.");
    }
    sourcePersianText = persianText.trim();
    renderCurrentMode();
  } catch (error) {
    console.error("AvaYar extraction failed.", error);
    sourcePersianText = "";
    preparedText = "";
    resetPlayback();
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "خروجی آماده نشد.";
    elements.output.replaceChildren(empty);
    elements.play.disabled = true;
    setStatus(error instanceof Error ? error.message : String(error), true);
  } finally {
    setBusy(false);
  }
}

function browserPlaybackEnded() {
  if (playbackMode !== "browser") return;
  playbackMode = "none";
  idlePlaybackControls("پخش به پایان رسید.");
}

function browserPlaybackFailed() {
  if (playbackMode !== "browser") return;
  playbackMode = "none";
  idlePlaybackControls();
  setStatus("پخش صدای جایگزین مرورگر با خطا روبه‌رو شد.", true);
}

async function playBrowserFallback(text = preparedText) {
  playbackMode = "browser";
  return browserSpeech.speak({
    text,
    voicePreference: elements.voice.value,
    onStart: () => {
      elements.play.disabled = true;
      elements.play.textContent = "پخش";
      elements.pause.disabled = false;
      elements.stop.disabled = false;
      setStatus("Gemini در دسترس نیست؛ ادامه پخش با صدای فارسی مرورگر.");
    },
    onEnd: browserPlaybackEnded,
    onError: browserPlaybackFailed
  });
}

function remainingPlaybackText() {
  return playbackChunks.slice(playbackChunkIndex).join("\n\n").trim();
}

async function playServerChunk(generation) {
  if (playbackStopped || generation !== playbackGeneration) return;
  const chunk = playbackChunks[playbackChunkIndex];
  if (!chunk) {
    playbackMode = "none";
    idlePlaybackControls("پخش به پایان رسید.");
    return;
  }

  const ordinal = playbackChunkIndex + 1;
  const total = playbackChunks.length;
  elements.play.disabled = true;
  elements.pause.disabled = true;
  elements.stop.disabled = false;
  setStatus(`در حال آماده‌سازی بخش ${ordinal} از ${total}…`);

  const blob = await fetchServerAudio({
    text: chunk,
    voicePreference: elements.voice.value
  });

  if (playbackStopped || generation !== playbackGeneration) return;
  browserSpeech.cancel();
  revokeAudio();
  audioUrl = URL.createObjectURL(blob);
  elements.audio.src = audioUrl;
  playbackMode = "server";
  await elements.audio.play();
  setStatus(
    elements.voice.value === "female"
      ? `در حال پخش با صدای زن · بخش ${ordinal} از ${total}`
      : `در حال پخش با صدای مرد · بخش ${ordinal} از ${total}`
  );
}

async function startProgressiveServerPlayback() {
  playbackStopped = false;
  playbackChunks = splitPlaybackText(preparedText);
  playbackChunkIndex = 0;
  playbackGeneration += 1;
  const generation = playbackGeneration;
  if (!playbackChunks.length) throw new Error("متنی برای پخش آماده نیست.");
  await playServerChunk(generation);
}

async function play() {
  if (!preparedText || busy) return;

  if (playbackMode === "browser" && browserSpeech.paused) {
    browserSpeech.resume();
    elements.play.disabled = true;
    elements.play.textContent = "پخش";
    elements.pause.disabled = false;
    elements.stop.disabled = false;
    setStatus("پخش صدای جایگزین ادامه یافت.");
    return;
  }

  if (
    playbackMode === "server" &&
    elements.audio.src &&
    elements.audio.paused &&
    elements.audio.currentTime > 0 &&
    !elements.audio.ended
  ) {
    await elements.audio.play();
    setStatus(`پخش ادامه یافت · بخش ${playbackChunkIndex + 1} از ${playbackChunks.length}`);
    return;
  }

  try {
    await startProgressiveServerPlayback();
  } catch (serverError) {
    revokeAudio();
    const remaining = remainingPlaybackText() || preparedText;
    try {
      await playBrowserFallback(remaining);
    } catch (fallbackError) {
      playbackMode = "none";
      idlePlaybackControls();
      setStatus(
        serverError instanceof Error
          ? serverError.message
          : fallbackError instanceof Error
            ? fallbackError.message
            : "صدای فارسی در دسترس نیست.",
        true
      );
    }
  }
}

function pause() {
  if (playbackMode === "browser") {
    if (!browserSpeech.pause()) return;
    elements.play.disabled = false;
    elements.play.textContent = "ادامه";
    elements.pause.disabled = true;
    setStatus("پخش مکث شد.");
    return;
  }
  if (playbackMode !== "server" || elements.audio.paused || !elements.audio.src) return;
  elements.audio.pause();
  elements.play.disabled = false;
  elements.play.textContent = "ادامه";
  elements.pause.disabled = true;
  setStatus("پخش مکث شد.");
}

function stop() {
  playbackStopped = true;
  playbackGeneration += 1;
  playbackChunks = [];
  playbackChunkIndex = 0;
  if (playbackMode === "browser") browserSpeech.cancel();
  if (elements.audio.src) {
    elements.audio.pause();
    elements.audio.currentTime = 0;
  }
  revokeAudio();
  playbackMode = "none";
  idlePlaybackControls("پخش متوقف شد.");
}

elements.extract.addEventListener("click", extract);
elements.mode.addEventListener("change", () => {
  if (sourcePersianText) renderCurrentMode();
});
elements.voice.addEventListener("change", () => {
  resetPlayback();
  if (preparedText) setStatus("صدا تغییر کرد؛ برای شنیدن، پخش را بزن.");
});
elements.play.addEventListener("click", play);
elements.pause.addEventListener("click", pause);
elements.stop.addEventListener("click", stop);

elements.audio.addEventListener("playing", () => {
  playbackMode = "server";
  elements.play.disabled = true;
  elements.play.textContent = "پخش";
  elements.pause.disabled = false;
  elements.stop.disabled = false;
});

elements.audio.addEventListener("ended", async () => {
  if (playbackMode !== "server" || playbackStopped) return;
  playbackChunkIndex += 1;
  if (playbackChunkIndex >= playbackChunks.length) {
    playbackMode = "none";
    idlePlaybackControls("پخش به پایان رسید.");
    return;
  }
  const generation = playbackGeneration;
  try {
    await playServerChunk(generation);
  } catch (serverError) {
    revokeAudio();
    const remaining = remainingPlaybackText();
    try {
      await playBrowserFallback(remaining);
    } catch (fallbackError) {
      playbackMode = "none";
      idlePlaybackControls();
      setStatus(
        serverError instanceof Error
          ? serverError.message
          : fallbackError instanceof Error
            ? fallbackError.message
            : "ادامه پخش صدا در دسترس نیست.",
        true
      );
    }
  }
});

elements.audio.addEventListener("error", () => {
  if (playbackMode !== "server") return;
  playbackStopped = true;
  playbackMode = "none";
  idlePlaybackControls();
  setStatus("پخش صدا با خطا روبه‌رو شد.", true);
});
