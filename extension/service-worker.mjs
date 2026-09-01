const DEFAULT_DEVELOPMENT_API_BASE =
  "http://127.0.0.1:4173";

const PRODUCTION_API_BASE =
  "__AVAYAR_PRODUCTION_API_BASE__";

const EXTENSION_MODE =
  "__AVAYAR_EXTENSION_MODE__";

const ACTIVE_PAGE_CONTEXT =
  "activePageContext";

void chrome.sidePanel
  .setPanelBehavior({
    openPanelOnActionClick: false
  });

function pageContext(tab) {
  if (!tab?.id || !tab.url) {
    return null;
  }

  try {
    const url = new URL(tab.url);

    if (
      ![
        "http:",
        "https:"
      ].includes(url.protocol)
    ) {
      return null;
    }

    return {
      tabId: tab.id,
      url: tab.url,
      origin: url.origin
    };
  } catch {
    return null;
  }
}

chrome.action.onClicked.addListener(
  (tab) => {
    if (!tab?.id) {
      return;
    }

    const openPanel =
      chrome.sidePanel.open({
        tabId: tab.id
      });

    const context =
      pageContext(tab);

    const persistContext =
      context
        ? chrome.storage.session.set({
            [ACTIVE_PAGE_CONTEXT]:
              context
          })
        : chrome.storage.session.remove(
            ACTIVE_PAGE_CONTEXT
          );

    void Promise.all([
      openPanel,
      persistContext
    ]).catch((error) => {
      console.error(
        "AvaYar action handling failed.",
        error
      );
    });
  }
);

function normalizeHttpsApiBase(value) {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error(
      "ارتباط نسخه نهایی آوایار باید امن باشد."
    );
  }

  return url.origin;
}

function normalizeDevelopmentApiBase(value) {
  const url = new URL(
    value ||
    DEFAULT_DEVELOPMENT_API_BASE
  );

  if (
    url.protocol === "https:"
  ) {
    return url.origin;
  }

  if (
    url.protocol === "http:" &&
    [
      "127.0.0.1",
      "localhost"
    ].includes(url.hostname)
  ) {
    return url.origin;
  }

  throw new Error(
    "Development API must use HTTPS or localhost."
  );
}

async function resolveApiBase() {
  if (EXTENSION_MODE === "production") {
    if (
      !PRODUCTION_API_BASE ||
      PRODUCTION_API_BASE ===
        "__AVAYAR_PRODUCTION_API_BASE__"
    ) {
      throw new Error(
        "نسخه نهایی آوایار به سرویس آنلاین متصل نشده است."
      );
    }

    return normalizeHttpsApiBase(
      PRODUCTION_API_BASE
    );
  }

  const stored =
    await chrome.storage.local.get(
      "developerApiBase"
    );

  return normalizeDevelopmentApiBase(
    stored.developerApiBase
  );
}

function networkErrorMessage(apiBase) {
  const url =
    new URL(apiBase);

  const isLocal =
    [
      "127.0.0.1",
      "localhost"
    ].includes(url.hostname);

  return isLocal
    ? "سرویس توسعه آوایار در دسترس نیست."
    : "ارتباط با سرویس آنلاین آوایار برقرار نشد. دوباره تلاش کنید.";
}

function apiErrorMessage(
  response,
  error
) {
  if (response.status === 429) {
    return "ظرفیت سرویس آوایار موقتاً تکمیل است. کمی بعد دوباره تلاش کنید.";
  }

  if (
    response.status >= 500
  ) {
    return "سرویس آوایار موقتاً در دسترس نیست. دوباره تلاش کنید.";
  }

  return (
    error?.error ||
    `AvaYar API failed (${response.status}).`
  );
}

async function apiRequest({
  path,
  body,
  responseType = "json"
}) {
  const apiBase =
    await resolveApiBase();

  let response;

  try {
    response =
      await fetch(
        `${apiBase}${path}`,
        {
          method:
            body ? "POST" : "GET",

          headers:
            body
              ? {
                  "content-type":
                    "application/json"
                }
              : undefined,

          body:
            body
              ? JSON.stringify(body)
              : undefined
        }
      );
  } catch (error) {
    if (
      error instanceof TypeError ||
      error?.message ===
        "Failed to fetch"
    ) {
      throw new Error(
        networkErrorMessage(
          apiBase
        )
      );
    }

    throw error;
  }

  if (!response.ok) {
    const error =
      await response
        .json()
        .catch(
          () => ({})
        );

    throw new Error(
      apiErrorMessage(
        response,
        error
      )
    );
  }

  if (
    responseType === "audio"
  ) {
    const bytes =
      await response
        .arrayBuffer();

    return {
      bytes:
        Array.from(
          new Uint8Array(bytes)
        ),

      contentType:
        response.headers.get(
          "content-type"
        ) ||
        "audio/wav",

      voiceName:
        response.headers.get(
          "x-avayar-voice-name"
        ),

      voiceGender:
        response.headers.get(
          "x-avayar-voice-gender"
        )
    };
  }

  return await response.json();
}

chrome.runtime.onMessage.addListener(
  (
    message,
    _sender,
    sendResponse
  ) => {
    if (
      message?.target !==
        "avayar-api"
    ) {
      return false;
    }

    apiRequest(message)
      .then(
        (result) =>
          sendResponse({
            ok: true,
            result
          })
      )
      .catch(
        (error) =>
          sendResponse({
            ok: false,

            error:
              error instanceof Error
                ? error.message
                : String(error)
          })
      );

    return true;
  }
);
