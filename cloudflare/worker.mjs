const ALLOWED_METHODS = "GET,HEAD,POST,OPTIONS";

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

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request)
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json(request, {
        ok: true,
        product: "AvaYar",
        service: "runtime-edge",
        status: "ready"
      });
    }

    return json(request, {
      ok: false,
      code: "AVAYAR_RUNTIME_ROUTE_NOT_MIGRATED",
      message: "This AvaYar edge route is not enabled yet."
    }, 404);
  }
};
