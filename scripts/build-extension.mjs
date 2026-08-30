import {
  cp,
  mkdir,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "extension");
const target = resolve(root, "dist-extension");

const productionApiBase =
  process.env.AVAYAR_PRODUCTION_API_BASE?.trim();

if (
  productionApiBase &&
  !productionApiBase.startsWith("https://")
) {
  throw new Error(
    "AVAYAR_PRODUCTION_API_BASE must use HTTPS."
  );
}

await rm(target, {
  recursive: true,
  force: true
});

await mkdir(target, {
  recursive: true
});

await cp(source, target, {
  recursive: true
});

await cp(
  resolve(
    root,
    "node_modules/@mozilla/readability/Readability.js"
  ),
  resolve(target, "readability.js")
);

await cp(
  resolve(root, "src/core"),
  resolve(target, "core"),
  {
    recursive: true
  }
);

await mkdir(
  resolve(target, "assets"),
  {
    recursive: true
  }
);

for (const size of [16, 32, 48, 128]) {
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
  resolve(root, "assets/brand/avayar-mark.png"),
  resolve(target, "assets/avayar-mark.png")
);

const packageJson = JSON.parse(
  await readFile(
    resolve(root, "package.json"),
    "utf8"
  )
);

const manifestPath =
  resolve(target, "manifest.json");

const manifest = JSON.parse(
  await readFile(
    manifestPath,
    "utf8"
  )
);

manifest.version = packageJson.version;

await writeFile(
  manifestPath,
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

if (productionApiBase) {
  const serviceWorkerPath =
    resolve(
      target,
      "service-worker.mjs"
    );

  const serviceWorker =
    await readFile(
      serviceWorkerPath,
      "utf8"
    );

  if (
    !serviceWorker.includes(
      "__AVAYAR_PRODUCTION_API_BASE__"
    )
  ) {
    throw new Error(
      "AvaYar production API placeholder was not found."
    );
  }

  await writeFile(
    serviceWorkerPath,
    serviceWorker.replaceAll(
      "__AVAYAR_PRODUCTION_API_BASE__",
      productionApiBase
    ),
    "utf8"
  );
}

console.log(
  `Built AvaYar extension ${manifest.version} into ${target}`
);

if (productionApiBase) {
  console.log(
    `Production API: ${productionApiBase}`
  );
}