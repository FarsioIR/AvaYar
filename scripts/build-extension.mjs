import {
  cp,
  mkdir,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";

import {
  resolve
} from "node:path";

const root =
  process.cwd();

const source =
  resolve(
    root,
    "extension"
  );

const target =
  resolve(
    root,
    "dist-extension"
  );

const mode =
  (
    process.env
      .AVAYAR_EXTENSION_MODE ||
    "development"
  )
    .trim()
    .toLowerCase();

if (
  ![
    "development",
    "production"
  ].includes(mode)
) {
  throw new Error(
    "AVAYAR_EXTENSION_MODE must be development or production."
  );
}

const productionApiBase =
  process.env
    .AVAYAR_PRODUCTION_API_BASE
    ?.trim();

if (
  mode === "production" &&
  !productionApiBase
) {
  throw new Error(
    "Production extension requires AVAYAR_PRODUCTION_API_BASE."
  );
}

if (
  productionApiBase &&
  !productionApiBase.startsWith(
    "https://"
  )
) {
  throw new Error(
    "AVAYAR_PRODUCTION_API_BASE must use HTTPS."
  );
}

await rm(
  target,
  {
    recursive: true,
    force: true
  }
);

await mkdir(
  target,
  {
    recursive: true
  }
);

await cp(
  source,
  target,
  {
    recursive: true
  }
);

await cp(
  resolve(
    root,
    "node_modules/@mozilla/readability/Readability.js"
  ),
  resolve(
    target,
    "readability.js"
  )
);

await cp(
  resolve(
    root,
    "src/core"
  ),
  resolve(
    target,
    "core"
  ),
  {
    recursive: true
  }
);

await mkdir(
  resolve(
    target,
    "assets"
  ),
  {
    recursive: true
  }
);

for (
  const size
  of [
    16,
    32,
    48,
    128
  ]
) {
  await cp(
    resolve(
      root,
      `assets/brand/avayar-mark-${size}.png`
    ),
    resolve(
      target,
      `assets/avayar-mark-${size}.png`
    )
  );
}

await cp(
  resolve(
    root,
    "assets/brand/avayar-mark.png"
  ),
  resolve(
    target,
    "assets/avayar-mark.png"
  )
);

const packageJson =
  JSON.parse(
    await readFile(
      resolve(
        root,
        "package.json"
      ),
      "utf8"
    )
  );

const manifestPath =
  resolve(
    target,
    "manifest.json"
  );

const manifest =
  JSON.parse(
    await readFile(
      manifestPath,
      "utf8"
    )
  );

manifest.version =
  packageJson.version;

if (
  mode === "production"
) {
  manifest.host_permissions =
    (manifest.host_permissions || [])
      .filter(
        permission =>
          !permission.includes("127.0.0.1") &&
          !permission.includes("localhost")
      );
}

await writeFile(
  manifestPath,
  `${JSON.stringify(
    manifest,
    null,
    2
  )}\n`,
  "utf8"
);

const serviceWorkerPath =
  resolve(
    target,
    "service-worker.mjs"
  );

let serviceWorker =
  await readFile(
    serviceWorkerPath,
    "utf8"
  );

if (
  !serviceWorker.includes(
    "__AVAYAR_EXTENSION_MODE__"
  )
) {
  throw new Error(
    "AvaYar extension mode placeholder was not found."
  );
}

serviceWorker =
  serviceWorker.replaceAll(
    "__AVAYAR_EXTENSION_MODE__",
    mode
  );

if (
  mode === "production"
) {
  if (
    !serviceWorker.includes(
      "__AVAYAR_PRODUCTION_API_BASE__"
    )
  ) {
    throw new Error(
      "AvaYar production API placeholder was not found."
    );
  }

  serviceWorker =
    serviceWorker.replaceAll(
      "__AVAYAR_PRODUCTION_API_BASE__",
      productionApiBase
    );

  const developmentBlockPattern =
    /const DEFAULT_DEVELOPMENT_API_BASE =[\s\S]*?async function resolveApiBase\(\) \{[\s\S]*?\n\}/u;

  if (
    !developmentBlockPattern.test(
      serviceWorker
    )
  ) {
    throw new Error(
      "AvaYar development runtime block was not found."
    );
  }

  serviceWorker =
    serviceWorker.replace(
      developmentBlockPattern,
      `function resolveApiBase() {
  return Promise.resolve(
    new URL(${JSON.stringify(productionApiBase)}).origin
  );
}`
    );

  serviceWorker =
    serviceWorker.replace(
      /function networkErrorMessage\(apiBase\) \{[\s\S]*?\n\}/u,
      `function networkErrorMessage() {
  return "ارتباط با سرویس آنلاین آوایار برقرار نشد. دوباره تلاش کنید.";
}`
    );

  if (
    /127\.0\.0\.1|localhost|developerApiBase|DEFAULT_DEVELOPMENT_API_BASE/u
      .test(serviceWorker)
  ) {
    throw new Error(
      "Production service worker still contains development runtime references."
    );
  }
}

await writeFile(
  serviceWorkerPath,
  serviceWorker,
  "utf8"
);

console.log(
  `Built AvaYar ${mode} extension ${manifest.version} into ${target}`
);

if (
  mode === "production"
) {
  console.log(
    `Production API: ${productionApiBase}`
  );
}
