import {
  summarizePersian
} from "./core/summary.mjs";

import {
  cleanArticleText
} from "./core/content-cleaner.mjs";

const elements = {
  extract:
    document.querySelector("#extract"),

  mode:
    document.querySelector("#mode"),

  voice:
    document.querySelector("#voice"),

  status:
    document.querySelector("#status"),

  title:
    document.querySelector("#title"),

  modeBadge:
    document.querySelector("#modeBadge"),

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

let sourcePersianText = "";
let preparedText = "";
let audioUrl = null;
let busy = false;

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

function setBusy(
  value,
  message
) {
  busy = value;

  elements.extract.disabled =
    value;

  elements.mode.disabled =
    value;

  elements.voice.disabled =
    value;

  if (message) {
    setStatus(message);
  }
}

function revokeAudio() {
  if (audioUrl) {
    URL.revokeObjectURL(
      audioUrl
    );

    audioUrl = null;
  }

  elements.audio.removeAttribute(
    "src"
  );

  elements.audio.load();

  elements.pause.disabled = true;
  elements.stop.disabled = true;
}

function resetAudio() {
  if (!elements.audio.paused) {
    elements.audio.pause();
  }

  revokeAudio();

  elements.play.disabled =
    !preparedText;

  elements.play.textContent =
    "پخش";
}

async function api(message) {
  const response =
    await chrome.runtime.sendMessage({
      target:
        "avayar-api",

      ...message
    });

  if (!response?.ok) {
    throw new Error(
      response?.error ||
      "ارتباط با آوایار برقرار نشد."
    );
  }

  return response.result;
}

async function currentTab() {
  const tabs =
    await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

  const tab =
    tabs[0];

  if (!tab?.id) {
    throw new Error(
      "صفحه فعال پیدا نشد."
    );
  }

  return tab;
}

async function ensurePageAccess(tab) {
  if (!tab.url) {
    throw new Error(
      "آدرس صفحه در دسترس نیست."
    );
  }

  const url =
    new URL(tab.url);

  if (
    ![
      "http:",
      "https:"
    ].includes(url.protocol)
  ) {
    throw new Error(
      "آوایار فقط روی صفحات وب قابل استفاده است."
    );
  }

  const originPattern =
    `${url.origin}/*`;

  const hasAccess =
    await chrome.permissions.contains({
      origins: [
        originPattern
      ]
    });

  if (hasAccess) {
    return;
  }

  const granted =
    await chrome.permissions.request({
      origins: [
        originPattern
      ]
    });

  if (!granted) {
    throw new Error(
      "برای خواندن این صفحه باید دسترسی آن را به آوایار بدهی."
    );
  }
}

function renderParagraphs(text) {
  const fragment =
    document.createDocumentFragment();

  const paragraphs =
    String(text || "")
      .split(/\n{2,}/u)
      .map(
        (value) =>
          value.trim()
      )
      .filter(Boolean);

  for (
    const value
    of paragraphs
  ) {
    const paragraph =
      document.createElement(
        "p"
      );

    paragraph.textContent =
      value;

    fragment.append(
      paragraph
    );
  }

  elements.output.replaceChildren(
    fragment
  );
}

function renderCurrentMode() {
  if (!sourcePersianText) {
    return;
  }

  resetAudio();

  if (
    elements.mode.value ===
    "summary"
  ) {
    preparedText =
      summarizePersian(
        sourcePersianText
      ).trim();

    elements.modeBadge.textContent =
      "خلاصه";

    renderParagraphs(
      preparedText
    );

    setStatus(
      "خلاصه فارسی آماده پخش است."
    );
  } else {
    preparedText =
      sourcePersianText.trim();

    elements.modeBadge.textContent =
      "متن کامل";

    renderParagraphs(
      preparedText
    );

    setStatus(
      "متن کامل فارسی آماده پخش است."
    );
  }

  elements.play.disabled =
    !preparedText;
}

async function extract() {
  setBusy(
    true,
    "در حال خواندن محتوای اصلی صفحه…"
  );

  resetAudio();

  try {
    const tab =
      await currentTab();

    await ensurePageAccess(
      tab
    );

    await chrome.scripting.executeScript({
      target: {
        tabId:
          tab.id
      },

      files: [
        "readability.js",
        "content-script.mjs"
      ]
    });

    const extracted =
      await chrome.tabs.sendMessage(
        tab.id,
        {
          type:
            "AVAYAR_EXTRACT"
        }
      );

    if (!extracted?.ok) {
      throw new Error(
        extracted?.error ||
        "متن اصلی این صفحه قابل استخراج نبود."
      );
    }

    elements.title.textContent =
      extracted.result.title ||
      "صفحه بدون عنوان";

    const source =
      cleanArticleText(
        extracted.result.text
      );

    if (
      !source ||
      source.length < 100
    ) {
      throw new Error(
        "محتوای اصلی کافی برای خواندن پیدا نشد."
      );
    }

    let persianText =
      source;

    if (
      !/[\u0600-\u06ff]/u
        .test(persianText)
    ) {
      setStatus(
        "متن انگلیسی شناسایی شد؛ در حال آماده‌سازی نسخه فارسی…"
      );

      const translated =
        await api({
          path:
            "/api/translate",

          body: {
            text:
              persianText
          }
        });

      persianText =
        cleanArticleText(
          translated.text
        );
    }

    if (
      !persianText ||
      persianText.length < 100
    ) {
      throw new Error(
        "نسخه فارسی آماده‌شده کافی نیست."
      );
    }

    sourcePersianText =
      persianText.trim();

    renderCurrentMode();
  }
  catch(error) {
    console.error(
      "AvaYar extraction failed.",
      error
    );

    sourcePersianText = "";
    preparedText = "";

    resetAudio();

    const empty =
      document.createElement(
        "p"
      );

    empty.className =
      "empty";

    empty.textContent =
      "خروجی آماده نشد.";

    elements.output.replaceChildren(
      empty
    );

    elements.play.disabled =
      true;

    setStatus(
      error instanceof Error
        ? error.message
        : String(error),
      true
    );
  }
  finally {
    setBusy(false);
  }
}

async function play() {
  if (
    !preparedText ||
    busy
  ) {
    return;
  }

  if (
    elements.audio.src &&
    elements.audio.paused &&
    elements.audio.currentTime > 0 &&
    !elements.audio.ended
  ) {
    await elements.audio.play();

    setStatus(
      "پخش ادامه یافت."
    );

    return;
  }

  elements.play.disabled =
    true;

  setStatus(
    "در حال آماده‌سازی صدای فارسی…"
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

    revokeAudio();

    const blob =
      new Blob(
        [
          new Uint8Array(
            result.bytes
          )
        ],
        {
          type:
            result.contentType ||
            "audio/wav"
        }
      );

    audioUrl =
      URL.createObjectURL(
        blob
      );

    elements.audio.src =
      audioUrl;

    await elements.audio.play();

    setStatus(
      elements.voice.value ===
        "female"
        ? "در حال پخش با صدای زن."
        : "در حال پخش با صدای مرد."
    );
  }
  catch(error) {
    elements.play.disabled =
      false;

    setStatus(
      error instanceof Error
        ? error.message
        : String(error),
      true
    );
  }
}

function pause() {
  if (
    elements.audio.paused ||
    !elements.audio.src
  ) {
    return;
  }

  elements.audio.pause();

  elements.play.disabled =
    false;

  elements.play.textContent =
    "ادامه";

  elements.pause.disabled =
    true;

  setStatus(
    "پخش مکث شد."
  );
}

function stop() {
  if (!elements.audio.src) {
    return;
  }

  elements.audio.pause();

  elements.audio.currentTime =
    0;

  elements.play.disabled =
    !preparedText;

  elements.play.textContent =
    "پخش";

  elements.pause.disabled =
    true;

  elements.stop.disabled =
    true;

  setStatus(
    "پخش متوقف شد."
  );
}

elements.extract.addEventListener(
  "click",
  extract
);

elements.mode.addEventListener(
  "change",
  () => {
    if (sourcePersianText) {
      renderCurrentMode();
    }
  }
);

elements.voice.addEventListener(
  "change",
  () => {
    resetAudio();

    if (preparedText) {
      setStatus(
        "صدا تغییر کرد؛ برای شنیدن، پخش را بزن."
      );
    }
  }
);

elements.play.addEventListener(
  "click",
  play
);

elements.pause.addEventListener(
  "click",
  pause
);

elements.stop.addEventListener(
  "click",
  stop
);

elements.audio.addEventListener(
  "playing",
  () => {
    elements.play.disabled =
      true;

    elements.play.textContent =
      "پخش";

    elements.pause.disabled =
      false;

    elements.stop.disabled =
      false;
  }
);

elements.audio.addEventListener(
  "ended",
  () => {
    elements.play.disabled =
      !preparedText;

    elements.play.textContent =
      "پخش";

    elements.pause.disabled =
      true;

    elements.stop.disabled =
      true;

    setStatus(
      "پخش به پایان رسید."
    );
  }
);

elements.audio.addEventListener(
  "error",
  () => {
    elements.play.disabled =
      !preparedText;

    elements.pause.disabled =
      true;

    elements.stop.disabled =
      true;

    setStatus(
      "پخش صدا با خطا روبه‌رو شد.",
      true
    );
  }
);
