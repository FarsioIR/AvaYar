import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = 41731;
const child = spawn(
  process.execPath,
  ["scripts/dev-server.mjs", "--root", "dist", "--port", String(port)],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, AVA_PRINT_PID: "1" }
  }
);

let stderr = "";
child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
});

try {
  let response = null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      response = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (response.ok) {
        break;
      }
    } catch {
      // Server can take a moment to bind.
    }

    await delay(100);
  }

  if (!response?.ok) {
    throw new Error(`Ava smoke server did not become healthy. ${stderr}`);
  }

  const health = await response.json();
  if (health.ok !== true || health.product !== "ava") {
    throw new Error(`Unexpected health payload: ${JSON.stringify(health)}`);
  }

  const indexResponse = await fetch(`http://127.0.0.1:${port}/`);
  const indexHtml = await indexResponse.text();

  if (!indexResponse.ok || !indexHtml.includes("Farsio / Ava")) {
    throw new Error("Built index did not serve expected Ava content.");
  }

  const appResponse = await fetch(`http://127.0.0.1:${port}/src/app.mjs`);
  if (!appResponse.ok) {
    throw new Error("Built app module is not reachable.");
  }

  console.log("Smoke test passed.");
} finally {
  child.kill();
}
