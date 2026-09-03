import {
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";

const root = process.cwd();
const extensionDir = resolve(root, "dist-extension");
const rcDir = resolve(root, "dist-rc");

const apiBase = process.env.AVAYAR_PRODUCTION_API_BASE?.trim();
const rcLabel = (process.env.AVAYAR_RC_LABEL || "rc").trim();

if (!apiBase) {
  throw new Error("AVAYAR_PRODUCTION_API_BASE is required for RC packaging.");
}

const apiUrl = new URL(apiBase);
if (apiUrl.protocol !== "https:") {
  throw new Error("RC API base must use HTTPS.");
}

const packageJson = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8")
);
const manifest = JSON.parse(
  await readFile(resolve(extensionDir, "manifest.json"), "utf8")
);
const serviceWorker = await readFile(
  resolve(extensionDir, "service-worker.mjs"),
  "utf8"
);

if (manifest.manifest_version !== 3) {
  throw new Error("RC manifest must use Manifest V3.");
}

if (manifest.version !== packageJson.version) {
  throw new Error(
    `RC version mismatch: manifest=${manifest.version} package=${packageJson.version}`
  );
}

const expectedPermission = `${apiUrl.origin}/*`;
if (!(manifest.host_permissions || []).includes(expectedPermission)) {
  throw new Error(`RC manifest is missing host permission ${expectedPermission}`);
}

const forbidden = [
  "127.0.0.1",
  "localhost",
  "developerApiBase",
  "DEFAULT_DEVELOPMENT_API_BASE",
  "__AVAYAR_PRODUCTION_API_BASE__",
  "__AVAYAR_EXTENSION_MODE__"
];

for (const marker of forbidden) {
  if (serviceWorker.includes(marker)) {
    throw new Error(`RC service worker contains forbidden marker: ${marker}`);
  }
}

if (!serviceWorker.includes(apiUrl.origin)) {
  throw new Error("RC service worker does not contain the production API origin.");
}

for (const required of [
  "sidepanel.html",
  "sidepanel.mjs",
  "service-worker.mjs",
  "content-script.mjs",
  "readability.js",
  "assets/avayar-mark-16.png",
  "assets/avayar-mark-32.png",
  "assets/avayar-mark-48.png",
  "assets/avayar-mark-128.png"
]) {
  await stat(resolve(extensionDir, required));
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = (await walk(extensionDir)).sort();
const inventory = [];
for (const path of files) {
  const bytes = await readFile(path);
  inventory.push({
    path: relative(extensionDir, path).replaceAll("\\", "/"),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

await mkdir(rcDir, { recursive: true });

const metadata = {
  product: "AvaYar",
  packageType: "browser-extension-rc",
  browsers: ["Chrome", "Edge"],
  manifestVersion: 3,
  version: packageJson.version,
  rcLabel,
  apiOrigin: apiUrl.origin,
  commit: process.env.GITHUB_SHA || null,
  fileCount: inventory.length,
  files: inventory
};

await writeFile(
  resolve(rcDir, "rc-metadata.json"),
  `${JSON.stringify(metadata, null, 2)}\n`,
  "utf8"
);

console.log(
  `AvaYar RC validation PASS: v${metadata.version} ${rcLabel}, ${inventory.length} files, API ${metadata.apiOrigin}`
);
