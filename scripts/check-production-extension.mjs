if (
  !process.env
    .AVAYAR_PRODUCTION_API_BASE
    ?.trim()
) {
  throw new Error(
    "AVAYAR_PRODUCTION_API_BASE is required."
  );
}

process.env.AVAYAR_EXTENSION_MODE =
  "production";

await import(
  "./check-extension.mjs"
);
