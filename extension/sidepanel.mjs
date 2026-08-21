import {
  summarizePersian
} from "./core/summary.mjs";

const elements = {
  extract:
    document.querySelector("#extract"),
  mode:
    document.querySelector("#mode"),
  voice:
    document.querySelector("#voice"),
  apiBase:
    document.querySelector("#apiBase"),
  saveSettings:
    document.querySelector("#saveSettings"),
  status:
    document.querySelector("#status"),
  title:
    document.querySelector("#title"),
  output:
    document.querySelector("#output"),
  play:
    document.querySelector("#play"),
  pause:
    document.querySelector("#pause"),
  stop:
    document.querySelector("#stop"),
  audio:
    document.querySelector("#audio")
};

let preparedText = "";
let audioUrl = null;

function setStatus(
  message,
  isError = false
) {
  elements.status.textContent =
    message;
  elements.status.classList.toggle(
    "error",
    isError
  );
}

async function api(message) {
  const response =
    await chrome.runtime
      .sendMessage({
        target:
          "avayar-api",
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
  const [tab] =
    await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

  if (!tab?.id) {
    throw new Error(
      "تب فعال پیدا نشد."
    );
  }

  return tab;
}

async function ensurePageAccess(
  tab
) {
  if (!tab.url) {
    throw new Error(
      "آدرس صفحه در دسترس نیست. صفحه را یک‌بار تازه‌سازی کنید."
    );
  }

  const url = new URL(tab.url);

  if (
    ![
      "http:",
      "https:"
    ].includes(url.protocol)
  ) {
    throw new Error(
      "آوایار فقط روی صفحه‌های عادی وب با آدرس HTTP یا HTTPS اجرا می‌شود."
    );
  }

  const originPattern =
    `${url.origin}/*`;
  const hasAccess =
    await chrome.permissions
      .contains({
        origins: [
          originPattern
        ]
      });

  if (hasAccess) {
    return;
  }

  const granted =
    await chrome.permissions
      .request({
        origins: [
          originPattern
        ]
      });

  if (!granted) {
    throw new Error(
      `برای خواندن این صفحه، دسترسی به ${url.hostname} لازم است.`
    );
  }
}

async function extract() {
  elements.extract.disabled = true;
  setStatus(
    "در حال استخراج متن صفحه…"
  );

  try {
    const tab =
      await currentTab();

    await ensurePageAccess(
      tab
    );

    await chrome.scripting
      .executeScript({
        target: {
          tabId: tab.id
        },
        files: [
          "content-script.mjs"
        ]
      });

    const extracted =
      await chrome.tabs
        .sendMessage(
          tab.id,
          {
            type:
              "AVAYAR_EXTRACT"
          }
        );

    if (!extracted?.ok) {
      throw new Error(
        extracted?.error ||
        "استخراج صفحه ناموفق بود."
      );
    }

    elements.title.textContent =
      extracted.result.title;

    let text =
      extracted.result.text;

    if (!/[\u0600-\u06ff]/u.test(text)) {
      setStatus(
        "در حال ترجمه متن به فارسی…"
      );

      const translated =
        await api({
          path:
            "/api/translate",
          body: {
            text
          }
        });

      text = translated.text;
    }

    if (
      elements.mode.value ===
      "summary"
    ) {
      text =
        summarizePersian(text);
    }

    preparedText = text.trim();
    elements.output.textContent =
      preparedText;
    elements.play.disabled = false;
    setStatus(
      "خروجی فارسی آماده پخش است."
    );
  } catch (error) {
    preparedText = "";
    elements.play.disabled = true;
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
  setStatus(
    "در حال ساخت صدای فارسی…"
  );

  try {
    const result =
      await api({
        path:
          "/api/tts",
        body: {
          text:
            preparedText,
          voicePreference:
            elements.voice.value
        },
        responseType:
          "audio"
      });

    if (audioUrl) {
      URL.revokeObjectURL(
        audioUrl
      );
    }

    const blob =
      new Blob(
        [
          new Uint8Array(
            result.bytes
          )
        ],
        {
          type:
            result.contentType
        }
      );

    audioUrl =
      URL.createObjectURL(blob);
    elements.audio.src =
      audioUrl;

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
    const url = new URL(
      elements.apiBase.value
    );
    const origin = url.origin;

    if (
      url.protocol === "https:" &&
      origin !== "https://farsio.ir"
    ) {
      const granted =
        await chrome.permissions
          .request({
            origins: [
              `${origin}/*`
            ]
          });

      if (!granted) {
        throw new Error(
          "دسترسی به سرور داده نشد."
        );
      }
    }

    await chrome.storage.local.set({
      apiBase: origin
    });

    elements.apiBase.value =
      origin;
    setStatus(
      "تنظیم سرور ذخیره شد."
    );
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "آدرس سرور معتبر نیست.",
      true
    );
  }
}

elements.extract.addEventListener(
  "click",
  extract
);

elements.play.addEventListener(
  "click",
  play
);

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

elements.saveSettings
  .addEventListener(
    "click",
    saveSettings
  );

const stored =
  await chrome.storage.local.get(
    "apiBase"
  );

if (stored.apiBase) {
  elements.apiBase.value =
    stored.apiBase;
}
