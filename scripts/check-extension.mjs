import {
  access,
  readFile,
  readdir
} from "node:fs/promises";
import { resolve } from "node:path";

await import("./build-extension.mjs");

const root = process.cwd();
const target = resolve(root, "dist-extension");
const manifest = JSON.parse(
  await readFile(
    resolve(target, "manifest.json"),
    "utf8"
  )
);

if (manifest.manifest_version !== 3) {
  throw new Error(
    "AvaYar extension must use Manifest V3."
  );
}

const requiredPermissions =
  [
    "activeTab",
    "scripting",
    "sidePanel",
    "storage"
  ];

for (const permission of requiredPermissions) {
  if (!manifest.permissions.includes(permission)) {
    throw new Error(
      `Missing extension permission: ${permission}`
    );
  }
}

if (
  manifest.permissions.includes("tabs") ||
  Array.isArray(manifest.content_scripts)
) {
  throw new Error(
    "AvaYar must not request persistent tab access or inject persistent content scripts."
  );
}

async function artifactText(
  directory
) {
  const chunks = [];

  for (
    const entry of
      await readdir(
        directory,
        {
          withFileTypes: true
        }
      )
  ) {
    const path =
      resolve(
        directory,
        entry.name
      );

    if (entry.isDirectory()) {
      chunks.push(
        await artifactText(path)
      );
    } else if (
      /\.(?:html|json|mjs|css|md)$/u.test(
        entry.name
      )
    ) {
      chunks.push(
        await readFile(
          path,
          "utf8"
        )
      );
    }
  }

  return chunks.join("\n");
}

const files =
  await artifactText(target);

if (/GEMINI_API_KEY|AIza[0-9A-Za-z_-]{20,}/u.test(files)) {
  throw new Error(
    "Credential-like content found in extension artifact names."
  );
}

for (const file of [
  "service-worker.mjs",
  "content-script.mjs",
  "sidepanel.html",
  "sidepanel.mjs",
  "sidepanel.css",
  "assets/avayar-mark.png"
]) {
  await access(resolve(target, file));
}

console.log(
  "Manifest V3 extension package check passed."
);
