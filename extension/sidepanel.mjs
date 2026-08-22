import {
  summarizePersian
} from "./core/summary.mjs";

const ACTIVE_PAGE_CONTEXT =
  "activePageContext";

const elements = {
  extract: document.querySelector("#extract"),
  mode: document.querySelector("#mode"),
  voice: document.querySelector("#voice"),
  apiBase: document.querySelector("#apiBase"),
  saveSettings: document.querySelector("#saveSettings"),
  status: document.querySelector("#status"),
  title: document.querySelector("#title"),
  output: document.querySelector("#output"),
  play: document.querySelector("#play"),
  pause: document.querySelector("#pause"),
  stop: document.querySelector("#stop"),
  audio: document.querySelector("#audio")
};

let preparedText = "";
let audioUrl = null;

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
}

async function api(message) {
  const response = await chrome.runtime.sendMessage({
    target: "avayar-api",
    ...message
  });

  if (!response?.ok) {
    throw new Error(
      response?.error ||
      "ارتباط با سرور آوایار ناموفق بود."
    );
  }

  return response.result;
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    throw new Error("تب فعال پیدا نشد.");
  }

  if (tab.url) {
    return tab;
  }

  const stored = await chrome.storage.session.get(
    ACTIVE_PAGE_CONTEXT
  );
  const context = stored[ACTIVE_PAGE_CONTEXT];

  if (context?.tabId === tab.id && context.url) {
    return {
      ...tab,
      url: context.url
    };
  }

  throw new Error(
    "دسترسی صفحه منقضی شده است. یک‌بار روی آیکن آوایار در نوار ابزار Chrome کلیک کنید و دوباره «خواندن صفحه فعلی» را بزنید."
  );
}

async function ensurePageAccess(tab) {
  if (!tab.url) {
    throw new Error("آدرس صفحه در دسترس نیست.");
  }

  const url = new URL(tab.url);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(
      "آوایار فقط روی صفحه‌های عادی وب با آدرس HTTP یا HTTPS اجرا می‌شود."
    );
  }

  const originPattern = `${url.origin}/*`;
  const hasAccess = await chrome.permissions.contains({
    origins: [originPattern]
  });

  if (hasAccess) {
    return;
  }

  const granted = await chrome.permissions.request({
    origins: [originPattern]
  });

  if (!granted) {
    throw new Error(
      `برای خواندن این صفحه، دسترسی به ${url.hostname} لازم است.`
    );
  }
}

function normalizeBlocks(result) {
  if (Array.isArray(result?.blocks) && result.blocks.length) {
    return result.blocks
      .map((block) => ({
        type: block.type || "paragraph",
        level: block.level,
        text: String(block.text || "").trim()
      }))
      .filter((block) => block.text);
  }

  return String(result?.text || "")
    .split(/\n{2,}/u)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({
      type: "paragraph",
      text
    }));
}

function blocksToPlainText(blocks) {
  return blocks
    .map((block) => block.text)
    .join("\n\n")
    .trim();
}

function sentenceEnded(text) {
  return /[.!?؟؛:]$/u.test(text.trim());
}

function blocksToSpeechText(blocks) {
  return blocks
    .map((block) => {
      const text = block.text.trim();

      if (block.type === "heading") {
        return sentenceEnded(text)
          ? `${text}\n\n`
          : `${text}.\n\n`;
      }

      if (block.type === "list-item") {
        return sentenceEnded(text)
          ? `${text}\n`
          : `${text}.\n`;
      }

      return `${text}\n\n`;
    })
    .join("")
    .trim();
}

function renderBlocks(blocks) {
  const fragment = document.createDocumentFragment();

  for (const block of blocks) {
    let element;

    if (block.type === "heading") {
      element = document.createElement(
        block.level === 4 ? "h4" : "h3"
      );
      element.className = "avayar-heading";
    } else if (block.type === "quote") {
      element = document.createElement("blockquote");
      element.className = "avayar-quote";
    } else if (block.type === "list-item") {
      element = document.createElement("p");
      element.className = "avayar-list-item";
      element.textContent = `• ${block.text}`;
      fragment.append(element);
      continue;
    } else {
      element = document.createElement("p");
      element.className = "avayar-paragraph";
    }

    element.textContent = block.text;
    fragment.append(element);
  }

  elements.output.replaceChildren(fragment);
}

function renderSummary(text) {
  const paragraph = document.createElement("p");
  paragraph.className = "avayar-paragraph";
  paragraph.textContent = text;
  elements.output.replaceChildren(paragraph);
}

async function translateBlocksToPersian(blocks) {
  const translated = [];

  for (const block of blocks) {
    if (/[\u0600-\u06ff]/u.test(block.text)) {
      translated.push(block);
      continue;
    }

    const result = await api({
      path: "/api/translate",
      body: {
        text: block.text
      }
    });

    translated.push({
      ...block,
      text: String(result.text || "").trim()
    });
  }

  return translated.filter((block) => block.text);
}

async function extract() {
  elements.extract.disabled = true;
  setStatus("در حال استخراج متن صفحه…");

  try {
    const tab = await currentTab();
    await ensurePageAccess(tab);

    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: [
        "readability.js",
        "content-script.mjs"
      ]
    });

    const extracted = await chrome.tabs.sendMessage(
      tab.id,
      {
        type: "AVAYAR_EXTRACT"
      }
    );

    if (!extracted?.ok) {
      throw new Error(
        extracted?.error ||
        "استخراج صفحه ناموفق بود."
      );
    }

    elements.title.textContent = extracted.result.title;

    let blocks = normalizeBlocks(extracted.result);
    const sourceText = blocksToPlainText(blocks);

    if (!/[\u0600-\u06ff]/u.test(sourceText)) {
      setStatus(
        "در حال ترجمه ساختاریافته متن به فارسی…"
      );
      blocks = await translateBlocksToPersian(blocks);
    }

    const fullText = blocksToPlainText(blocks);

    if (elements.mode.value === "summary") {
      const summary = summarizePersian(fullText);
      preparedText = summary.trim();
      renderSummary(preparedText);
    } else {
      preparedText = blocksToSpeechText(blocks);
      renderBlocks(blocks);
    }

    elements.play.disabled = !preparedText;
    setStatus("خروجی فارسی آماده پخش است.");
  } catch (error) {
    preparedText = "";
    elements.play.disabled = true;
    elements.output.replaceChildren();
    setStatus(
      error instanceof Error
        ? error.message
        : String(error),
      true
    );
  } finally {
    elements.extract.disabled = false;
  }
}

async function play() {
  if (!preparedText) {
    return;
  }

  elements.play.disabled = true;
  setStatus("در حال ساخت صدای فارسی…");

  try {
    const result = await api({
      path: "/api/tts",
      body: {
        text: preparedText,
        voicePreference: elements.voice.value
      },
      responseType: "audio"
    });

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    const blob = new Blob(
      [new Uint8Array(result.bytes)],
      {
        type: result.contentType
      }
    );

    audioUrl = URL.createObjectURL(blob);
    elements.audio.src = audioUrl;

    await elements.audio.play();
    elements.pause.disabled = false;
    elements.stop.disabled = false;
    setStatus(
      `در حال پخش با صدای ${result.voiceName || "فارسی"}.`
    );
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : String(error),
      true
    );
  } finally {
    elements.play.disabled = false;
  }
}

async function saveSettings() {
  try {
    const url = new URL(elements.apiBase.value);
    const origin = url.origin;

    if (
      url.protocol === "https:" &&
      origin !== "https://farsio.ir"
    ) {
      const granted = await chrome.permissions.request({
        origins: [
          `${origin}/*`
        ]
      });

      if (!granted) {
        throw new Error("دسترسی به سرور داده نشد.");
      }
    }

    await chrome.storage.local.set({
      apiBase: origin
    });

    elements.apiBase.value = origin;
    setStatus("تنظیم سرور ذخیره شد.");
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "آدرس سرور معتبر نیست.",
      true
    );
  }
}

elements.extract.addEventListener("click", extract);
elements.play.addEventListener("click", play);

elements.pause.addEventListener(
  "click",
  () => {
    elements.audio.pause();
    setStatus("پخش مکث شد.");
  }
);

elements.stop.addEventListener(
  "click",
  () => {
    elements.audio.pause();
    elements.audio.currentTime = 0;
    setStatus("پخش متوقف شد.");
  }
);

elements.saveSettings.addEventListener(
  "click",
  saveSettings
);

const stored = await chrome.storage.local.get(
  "apiBase"
);

if (stored.apiBase) {
  elements.apiBase.value = stored.apiBase;
}
