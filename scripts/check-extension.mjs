import {
  access,
  readFile,
  readdir
} from "node:fs/promises";

import {
  resolve
} from "node:path";

await import(
  "./build-extension.mjs"
);

const root =
  process.cwd();

const target =
  resolve(
    root,
    "dist-extension"
  );

const manifest =
  JSON.parse(
    await readFile(
      resolve(
        target,
        "manifest.json"
      ),
      "utf8"
    )
  );

if (
  manifest.manifest_version !== 3
) {
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

for (
  const permission
  of requiredPermissions
) {
  if (
    !manifest.permissions.includes(
      permission
    )
  ) {
    throw new Error(
      `Missing extension permission: ${permission}`
    );
  }
}

if (
  manifest.permissions.includes(
    "tabs"
  ) ||
  Array.isArray(
    manifest.content_scripts
  )
) {
  throw new Error(
    "AvaYar must not request persistent tab access or persistent content scripts."
  );
}

for (
  const origin
  of [
    "http://*/*",
    "https://*/*"
  ]
) {
  if (
    !manifest
      .optional_host_permissions
      ?.includes(origin)
  ) {
    throw new Error(
      `Missing optional page permission: ${origin}`
    );
  }
}

async function artifactText(
  directory
) {
  const chunks = [];

  for (
    const entry
    of await readdir(
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

    if (
      entry.isDirectory()
    ) {
      chunks.push(
        await artifactText(
          path
        )
      );
    } else if (
      /\.(?:html|json|mjs|js|css|md)$/u
        .test(entry.name)
    ) {
      chunks.push(
        await readFile(
          path,
          "utf8"
        )
      );
    }
  }

  return chunks.join(
    "\n"
  );
}

const files =
  await artifactText(
    target
  );

if (
  /GEMINI_API_KEY|AIza[0-9A-Za-z_-]{20,}/u
    .test(files)
) {
  throw new Error(
    "Credential-like content found in extension artifact."
  );
}

for (
  const file
  of [
    "service-worker.mjs",
    "content-script.mjs",
    "readability.js",
    "sidepanel.html",
    "sidepanel.mjs",
    "sidepanel.css",
    "assets/avayar-mark.png"
  ]
) {
  await access(
    resolve(
      target,
      file
    )
  );
}

const mode =
  (
    process.env
      .AVAYAR_EXTENSION_MODE ||
    "development"
  )
    .trim()
    .toLowerCase();

if (
  mode === "production"
) {
  if (
    /Private Beta|تنظیم سرور|127\.0\.0\.1:4173|localhost:4173/u
      .test(files)
  ) {
    throw new Error(
      "Production extension contains development-only UI or runtime references."
    );
  }

  if (
    files.includes(
      "__AVAYAR_PRODUCTION_API_BASE__"
    ) ||
    files.includes(
      "__AVAYAR_EXTENSION_MODE__"
    )
  ) {
    throw new Error(
      "Production extension contains unresolved build placeholders."
    );
  }

  const productionApiBase =
    process.env
      .AVAYAR_PRODUCTION_API_BASE
      ?.trim();

  if (!productionApiBase) {
    throw new Error(
      "Production extension check requires AVAYAR_PRODUCTION_API_BASE."
    );
  }

  const productionApiPermission =
    `${new URL(productionApiBase).origin}/*`;

  if (
    !manifest.host_permissions
      ?.includes(
        productionApiPermission
      )
  ) {
    throw new Error(
      `Missing production API host permission: ${productionApiPermission}`
    );
  }
}

console.log(
  `Manifest V3 ${mode} extension package check passed.`
);
