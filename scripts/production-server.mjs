import { createServer } from "node:http";
import { createApiHandler } from "../server/api.mjs";

function positiveInteger(value, fallback) {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
}

function allowedOrigins(env = process.env) {
  const configured =
    env.AVAYAR_CORS_ORIGINS
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  return new Set(configured);
}

const host =
  process.env.HOST?.trim() ||
  "0.0.0.0";

const port =
  positiveInteger(
    process.env.PORT,
    4173
  );

const requestTimeoutMs =
  positiveInteger(
    process.env.AVAYAR_REQUEST_TIMEOUT_MS,
    120000
  );

const rateWindowMs =
  positiveInteger(
    process.env.AVAYAR_RATE_LIMIT_WINDOW_MS,
    60000
  );

const rateLimit =
  positiveInteger(
    process.env.AVAYAR_RATE_LIMIT_MAX,
    120
  );

const corsOrigins =
  allowedOrigins();

const rateBuckets =
  new Map();

const handleApi =
  createApiHandler();

function clientAddress(request) {
  const forwarded =
    request.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return (
    request.socket.remoteAddress ||
    "unknown"
  );
}

function allowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  return corsOrigins.has(origin);
}

function applyCors(request, response) {
  const origin =
    request.headers.origin;

  if (!origin) {
    return true;
  }

  if (!allowedOrigin(origin)) {
    return false;
  }

  response.setHeader(
    "access-control-allow-origin",
    origin
  );

  response.setHeader(
    "vary",
    "Origin"
  );

  response.setHeader(
    "access-control-allow-methods",
    "GET,POST,OPTIONS"
  );

  response.setHeader(
    "access-control-allow-headers",
    "content-type"
  );

  return true;
}

function withinRateLimit(request) {
  const now = Date.now();
  const key = clientAddress(request);

  const existing =
    rateBuckets.get(key);

  if (
    !existing ||
    now - existing.startedAt >=
      rateWindowMs
  ) {
    rateBuckets.set(key, {
      startedAt: now,
      count: 1
    });

    return true;
  }

  existing.count += 1;

  return existing.count <= rateLimit;
}

function json(
  response,
  status,
  value
) {
  response.writeHead(status, {
    "content-type":
      "application/json; charset=utf-8",
    "cache-control":
      "no-store"
  });

  response.end(
    JSON.stringify(value)
  );
}

const server =
  createServer(
    async (
      request,
      response
    ) => {
      response.setHeader(
        "x-content-type-options",
        "nosniff"
      );

      response.setHeader(
        "referrer-policy",
        "no-referrer"
      );

      response.setHeader(
        "x-frame-options",
        "DENY"
      );

      if (!applyCors(request, response)) {
        json(
          response,
          403,
          {
            error:
              "Origin is not allowed."
          }
        );

        return;
      }

      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }

      if (
        request.url === "/healthz" &&
        request.method === "GET"
      ) {
        json(
          response,
          200,
          {
            ok: true,
            product: "avayar",
            runtime: "production"
          }
        );

        return;
      }

      if (!withinRateLimit(request)) {
        response.setHeader(
          "retry-after",
          String(
            Math.ceil(
              rateWindowMs / 1000
            )
          )
        );

        json(
          response,
          429,
          {
            error:
              "Too many requests."
          }
        );

        return;
      }

      if (
        await handleApi(
          request,
          response
        )
      ) {
        return;
      }

      json(
        response,
        404,
        {
          error:
            "Not found."
        }
      );
    }
  );

server.requestTimeout =
  requestTimeoutMs;

server.headersTimeout =
  Math.min(
    requestTimeoutMs,
    60000
  );

server.listen(
  port,
  host,
  () => {
    console.log(
      `AvaYar production API listening on ${host}:${port}`
    );
  }
);

function shutdown(signal) {
  console.log(
    `AvaYar received ${signal}; shutting down.`
  );

  server.close(
    (error) => {
      if (error) {
        console.error(error);
        process.exitCode = 1;
      }
    }
  );
}

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);
