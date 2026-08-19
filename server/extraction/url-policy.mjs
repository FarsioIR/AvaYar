import { lookup as defaultLookup } from "node:dns/promises";
import { isIP } from "node:net";

function isBlockedIpv4(address) {
  const parts = address
    .split(".")
    .map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255
    )
  ) {
    return true;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

function isBlockedIpv6(address) {
  const normalized = address.toLowerCase();

  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);

    if (isIP(mapped) === 4) {
      return isBlockedIpv4(mapped);
    }
  }

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

export function isPublicIpAddress(address) {
  const family = isIP(address);

  if (family === 4) {
    return !isBlockedIpv4(address);
  }

  if (family === 6) {
    return !isBlockedIpv6(address);
  }

  return false;
}

export function parsePublicHttpsUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Page URL must be a non-empty string.");
  }

  let url;

  try {
    url = new URL(value.trim());
  } catch {
    throw new TypeError("Page URL is invalid.");
  }

  if (url.protocol !== "https:") {
    throw new TypeError(
      "AvaYar webpage extraction accepts HTTPS URLs only."
    );
  }

  if (url.username || url.password) {
    throw new TypeError(
      "Page URLs with embedded credentials are not allowed."
    );
  }

  if (url.port && url.port !== "443") {
    throw new TypeError(
      "AvaYar webpage extraction allows HTTPS port 443 only."
    );
  }

  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase();

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost")
  ) {
    throw new TypeError(
      "Localhost targets are not allowed."
    );
  }

  return url;
}

export async function resolvePublicHttpsTarget(
  value,
  { lookup = defaultLookup } = {}
) {
  const url = parsePublicHttpsUrl(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  if (isIP(hostname)) {
    if (!isPublicIpAddress(hostname)) {
      throw new TypeError(
        "Private, local, reserved, or non-public IP targets are not allowed."
      );
    }

    return {
      url,
      address: hostname,
      family: isIP(hostname)
    };
  }

  const records = await lookup(hostname, {
    all: true,
    verbatim: true
  });

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(
      "Page hostname did not resolve to an IP address."
    );
  }

  const publicRecords = records.filter(
    (record) =>
      isPublicIpAddress(record.address)
  );

  if (publicRecords.length !== records.length) {
    throw new TypeError(
      "Page hostname resolved to a private, local, reserved, or non-public IP."
    );
  }

  const selected = publicRecords[0];

  return {
    url,
    address: selected.address,
    family: selected.family
  };
}
