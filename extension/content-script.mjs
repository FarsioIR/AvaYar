function extractReadableText() {
  const candidates =
    [
      document.querySelector("article"),
      document.querySelector("main"),
      document.querySelector("[role='main']"),
      document.body
    ]
      .filter(Boolean);

  const selected =
    candidates
      .map(
        (element) => ({
          element,
          text:
            element.innerText
              .replace(/\n{3,}/gu, "\n\n")
              .trim()
        })
      )
      .sort(
        (left, right) =>
          right.text.length -
          left.text.length
      )[0];

  if (
    !selected ||
    selected.text.length < 40
  ) {
    throw new Error(
      "متن قابل‌خواندن کافی در این صفحه پیدا نشد."
    );
  }

  return {
    title:
      document.title ||
      location.hostname,
    url:
      location.href,
    text:
      selected.text.slice(
        0,
        100_000
      ),
    truncated:
      selected.text.length >
      100_000
  };
}

chrome.runtime.onMessage.addListener(
  (
    message,
    _sender,
    sendResponse
  ) => {
    if (
      message?.type !==
        "AVAYAR_EXTRACT"
    ) {
      return false;
    }

    try {
      sendResponse({
        ok: true,
        result:
          extractReadableText()
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }

    return false;
  }
);
