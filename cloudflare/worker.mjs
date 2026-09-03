const ALLOWED_METHODS = "GET,HEAD,POST,OPTIONS";
const TRANSLATION_MODEL = "@cf/meta/m2m100-1.2b";
const MAX_TRANSLATION_CHARS = 20000;

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(request, body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request),
      ...extraHeaders
    }
  });
}

function hasPersian(text) {
  return /[\u0600-\u06ff]/u.test(text);
}

function translatedText(value) {
  const candidates = [
    value?.translated_text,
    value?.translatedText,
    value?.translation,
    value?.response,
    value?.text,
    value?.result?.translated_text,
    value?.result?.translatedText,
    value?.result?.translation,
    value?.result?.response,
    value?.result?.text
  ];

  return candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim()
  )?.trim() || "";
}

async function parseJsonBody(request) {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function translate(request, env) {
  const body = await parseJsonBody(request);
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return json(request, {
      ok: false,
      code: "AVAYAR_TRANSLATE_INVALID_INPUT",
      error: "متن برای ترجمه ارسال نشده است."
    }, 400);
  }

  if (text.length > MAX_TRANSLATION_CHARS) {
    return json(request, {
      ok: false,
      code: "AVAYAR_TRANSLATE_INPUT_TOO_LARGE",
      error: "متن برای ترجمه بیش از حد طولانی است."
    }, 413);
  }

  if (hasPersian(text)) {
    return json(request, {
      text,
      provider: "passthrough-fa",
      fallbackUsed: false
    });
  }

  if (!env?.AI || typeof env.AI.run !== "function") {
    return json(request, {
      ok: false,
      code: "AVAYAR_TRANSLATION_UNAVAILABLE",
      error: "سرویس ترجمه آوایار موقتاً در دسترس نیست."
    }, 503);
  }

  try {
    const result = await env.AI.run(
      TRANSLATION_MODEL,
      {
        text,
        source_lang: "en",
        target_lang: "fa"
      }
    );

    const output = translatedText(result);

    if (!output || !hasPersian(output)) {
      return json(request, {
        ok: false,
        code: "AVAYAR_TRANSLATION_INVALID_OUTPUT",
        error: "ترجمه فارسی معتبر دریافت نشد."
      }, 503);
    }

    return json(request, {
      text: output,
      provider: "cloudflare-m2m100",
      fallbackUsed: true
    });
  } catch (error) {
    console.error("AvaYar edge translation failed.", {
      name: error?.name,
      status: error?.status
    });

    return json(request, {
      ok: false,
      code: "AVAYAR_TRANSLATION_UNAVAILABLE",
      error: "سرویس ترجمه آوایار موقتاً در دسترس نیست."
    }, 503);
  }
}

function ttsUnavailable(request) {
  return json(request, {
    ok: false,
    code: "AVAYAR_SPEECH_BROWSER_FALLBACK_REQUIRED",
    error: "صدای سرور موقتاً در دسترس نیست؛ از صدای فارسی مرورگر استفاده می‌شود.",
    retryable: true,
    fallbackAttempted: false
  }, 503, {
    "Retry-After": "60"
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json(request, {
        ok: true,
        product: "AvaYar",
        service: "runtime-edge",
        status: "ready",
        capabilities: {
          translation: "cloudflare-workers-ai",
          speech: "browser-fallback"
        }
      });
    }

    if (request.method === "POST" && url.pathname === "/api/translate") {
      return translate(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/tts") {
      return ttsUnavailable(request);
    }

    return json(request, {
      ok: false,
      code: "AVAYAR_RUNTIME_ROUTE_NOT_FOUND",
      error: "مسیر درخواستی آوایار پیدا نشد."
    }, 404);
  }
};
