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

function parseIpv6Hextets(address) {
  let normalized = address
    .toLowerCase()
    .replace(/^\[|\]$/g, "");

  if (isIP(normalized) !== 6) {
    return null;
  }

  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    const dotted = normalized.slice(lastColon + 1);

    if (isIP(dotted) !== 4) {
      return null;
    }

    const octets = dotted
      .split(".")
      .map((part) => Number(part));

    const high =
      ((octets[0] << 8) | octets[1])
        .toString(16);

    const low =
      ((octets[2] << 8) | octets[3])
        .toString(16);

    normalized =
      `${normalized.slice(0, lastColon)}:${high}:${low}`;
  }

  const doubleColonCount =
    normalized.split("::").length - 1;

  if (doubleColonCount > 1) {
    return null;
  }

  let parts;

  if (normalized.includes("::")) {
    const [leftText, rightText] =
      normalized.split("::");

    const left =
      leftText
        ? leftText.split(":")
        : [];

    const right =
      rightText
        ? rightText.split(":")
        : [];

    const missing =
      8 - left.length - right.length;

    if (missing < 1) {
      return null;
    }

    parts = [
      ...left,
      ...Array(missing).fill("0"),
      ...right
    ];
  } else {
    parts = normalized.split(":");

    if (parts.length !== 8) {
      return null;
    }
  }

  const hextets =
    parts.map((part) => {
      if (!/^[0-9a-f]{1,4}$/u.test(part)) {
        return null;
      }

      return Number.parseInt(part, 16);
    });

  if (
    hextets.length !== 8 ||
    hextets.some((part) => part === null)
  ) {
    return null;
  }

  return hextets;
}

function ipv6ToBigInt(address) {
  const hextets = parseIpv6Hextets(address);

  if (!hextets) {
    return null;
  }

  return hextets.reduce(
    (value, part) =>
      (value << 16n) | BigInt(part),
    0n
  );
}

function isIpv6InPrefix(
  address,
  prefix,
  prefixLength
) {
  const value = ipv6ToBigInt(address);
  const base = ipv6ToBigInt(prefix);

  if (
    value === null ||
    base === null ||
    !Number.isInteger(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > 128
  ) {
    return false;
  }

  if (prefixLength === 0) {
    return true;
  }

  const shift =
    BigInt(128 - prefixLength);

  return (
    value >> shift
  ) === (
    base >> shift
  );
}

const BLOCKED_IPV6_PREFIXES = Object.freeze([
  ["::", 96],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["100:0:0:1::", 64],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:10::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["5f00::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8]
]);

function isBlockedIpv6(address) {
  return BLOCKED_IPV6_PREFIXES.some(
    ([prefix, prefixLength]) =>
      isIpv6InPrefix(
        address,
        prefix,
        prefixLength
      )
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
