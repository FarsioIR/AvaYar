import { request as httpsRequest } from "node:https";
import {
  resolvePublicHttpsTarget
} from "./url-policy.mjs";

const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 12_000;

function readResponseBody(response) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    response.on("data", (chunk) => {
      total += chunk.length;

      if (total > MAX_HTML_BYTES) {
        response.destroy(
          new Error(
            "Remote page exceeded the 2 MiB extraction limit."
          )
        );
        return;
      }

      chunks.push(Buffer.from(chunk));
    });

    response.once("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    response.once("error", reject);
  });
}

export function createPinnedLookup(target) {
  if (
    !target ||
    typeof target.address !== "string" ||
    ![4, 6].includes(target.family)
  ) {
    throw new TypeError(
      "Pinned HTTPS target must contain a validated IP address and family."
    );
  }

  return function pinnedLookup(
    _hostname,
    options,
    callback
  ) {
    if (typeof callback !== "function") {
      throw new TypeError(
        "Pinned DNS lookup callback is required."
      );
    }

    if (
      options &&
      typeof options === "object" &&
      options.all === true
    ) {
      callback(
        null,
        [
          {
            address: target.address,
            family: target.family
          }
        ]
      );
      return;
    }

    callback(
      null,
      target.address,
      target.family
    );
  };
}

function requestPinned(target) {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      target.url,
      {
        method: "GET",
        family: target.family,
        autoSelectFamily: false,
        lookup: createPinnedLookup(target),
        headers: {
          accept:
            "text/html,application/xhtml+xml;q=0.9",
          "user-agent":
            "AvaYar/0.4 secure-webpage-extraction"
        }
      },
      resolve
    );

    request.setTimeout(
      REQUEST_TIMEOUT_MS,
      () => {
        request.destroy(
          new Error("Remote page request timed out.")
        );
      }
    );

    request.once("error", reject);
    request.end();
  });
}

function isRedirect(statusCode) {
  return (
    statusCode === 301 ||
    statusCode === 302 ||
    statusCode === 303 ||
    statusCode === 307 ||
    statusCode === 308
  );
}

export async function fetchPublicHtml(
  value,
  {
    resolveTarget = resolvePublicHttpsTarget,
    maxRedirects = MAX_REDIRECTS
  } = {}
) {
  let current = value;

  for (
    let redirects = 0;
    redirects <= maxRedirects;
    redirects += 1
  ) {
    const target = await resolveTarget(current);
    const response = await requestPinned(target);
    const statusCode = response.statusCode ?? 0;

    if (isRedirect(statusCode)) {
      const location = response.headers.location;
      response.resume();

      if (!location) {
        throw new Error(
          "Remote page redirect did not provide a Location header."
        );
      }

      if (redirects >= maxRedirects) {
        throw new Error(
          "Remote page exceeded the redirect limit."
        );
      }

      current = new URL(
        location,
        target.url
      ).toString();

      continue;
    }

    if (statusCode < 200 || statusCode >= 300) {
      response.resume();

      throw new Error(
        `Remote page returned HTTP ${statusCode}.`
      );
    }

    const contentType = String(
      response.headers["content-type"] ?? ""
    ).toLowerCase();

    if (
      !contentType.includes("text/html") &&
      !contentType.includes(
        "application/xhtml+xml"
      )
    ) {
      response.resume();

      throw new TypeError(
        "Remote URL did not return HTML content."
      );
    }

    const html = await readResponseBody(response);

    return {
      html,
      finalUrl: target.url.toString()
    };
  }

  throw new Error(
    "Remote page redirect processing failed."
  );
}
