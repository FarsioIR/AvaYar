import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();

const manifest = JSON.parse(
  await readFile(
    resolve(root, "extension/manifest.json"),
    "utf8"
  )
);

const contract = await readFile(
  resolve(root, "docs/STORE-READINESS-0.6.0.md"),
  "utf8"
);

function fail(message) {
  throw new Error(`AvaYar store-readiness gate failed: ${message}`);
}

if (manifest.manifest_version !== 3) {
  fail("manifest_version must be 3");
}

if (manifest.version !== "0.6.0") {
  fail(`expected manifest version 0.6.0, got ${manifest.version}`);
}

const requiredPermissions = [
  "activeTab",
  "scripting",
  "sidePanel",
  "storage"
];

for (const permission of requiredPermissions) {
  if (!(manifest.permissions || []).includes(permission)) {
    fail(`missing required permission: ${permission}`);
  }
}

const forbiddenPermissions = [
  "tabs",
  "cookies",
  "history",
  "downloads",
  "webRequest",
  "webRequestBlocking",
  "management",
  "debugger"
];

for (const permission of forbiddenPermissions) {
  if ((manifest.permissions || []).includes(permission)) {
    fail(`forbidden broad permission present: ${permission}`);
  }
}

const optionalHosts = manifest.optional_host_permissions || [];
for (const host of ["http://*/*", "https://*/*"]) {
  if (!optionalHosts.includes(host)) {
    fail(`missing optional user-invoked page host permission: ${host}`);
  }
}

const sourceHosts = manifest.host_permissions || [];
for (const host of [
  "http://127.0.0.1/*",
  "http://localhost/*",
  "https://farsio.ir/*"
]) {
  if (!sourceHosts.includes(host)) {
    fail(`development/source manifest contract changed unexpectedly: ${host}`);
  }
}

const requiredContractMarkers = [
  "activeTab",
  "optional_host_permissions",
  "provider credentials remain server-side",
  "must not claim that all processing is local",
  "Chrome Web Store",
  "Microsoft Edge Add-ons",
  "SHA-256",
  "Issue #61"
];

for (const marker of requiredContractMarkers) {
  if (!contract.includes(marker)) {
    fail(`store readiness contract missing marker: ${marker}`);
  }
}

console.log(
  "AvaYar store-readiness gate PASS: Manifest V3, bounded required permissions, optional page access, privacy/data-flow and stable provenance contract verified."
);
