const DEFAULT_API_BASE =
  "http://127.0.0.1:4173";

const ACTIVE_PAGE_CONTEXT =
  "activePageContext";

void chrome.sidePanel
  .setPanelBehavior({
    openPanelOnActionClick:
      false
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
  async (tab) => {
    const context =
      pageContext(tab);

    if (context) {
      await chrome.storage
        .session.set({
          [ACTIVE_PAGE_CONTEXT]:
            context
        });
    } else {
      await chrome.storage
        .session.remove(
          ACTIVE_PAGE_CONTEXT
        );
    }

    if (tab?.id) {
      await chrome.sidePanel.open({
        tabId: tab.id
      });
    }
  }
);

function normalizedApiBase(value) {
  const url = new URL(
    value || DEFAULT_API_BASE
  );

  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      [
        "127.0.0.1",
        "localhost"
      ].includes(url.hostname)
    )
  ) {
    throw new Error(
      "سرور آوایار باید HTTPS یا localhost باشد."
    );
  }

  return url.origin;
}

async function apiRequest({
  path,
  body,
  responseType = "json"
}) {
  const stored =
    await chrome.storage.local.get(
      "apiBase"
    );

  const apiBase =
    normalizedApiBase(
      stored.apiBase
    );

  const response = await fetch(
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

  if (!response.ok) {
    const error =
      await response
        .json()
        .catch(
          () => ({})
        );

    throw new Error(
      error.error ||
      `AvaYar API failed (${response.status}).`
    );
  }

  if (responseType === "audio") {
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
        ) || "audio/wav",
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
