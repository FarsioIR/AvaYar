import {
  spawn
} from "node:child_process";
import {
  dirname,
  resolve
} from "node:path";
import {
  fileURLToPath
} from "node:url";

const here =
  dirname(
    fileURLToPath(
      import.meta.url
    )
  );

const forwarded =
  process.argv.slice(2);

const isWindows =
  process.platform === "win32";

const command =
  isWindows
    ? "pwsh"
    : process.execPath;

const args =
  isWindows
    ? [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        resolve(
          here,
          "start-avayar-windows.ps1"
        ),
        ...forwarded
      ]
    : [
        resolve(
          here,
          "dev-server.mjs"
        ),
        ...forwarded
      ];

const child =
  spawn(
    command,
    args,
    {
      stdio: "inherit",
      env: process.env
    }
  );

child.on(
  "error",
  (error) => {
    console.error(
      error instanceof Error
        ? error.message
        : String(error)
    );
    process.exitCode = 1;
  }
);

child.on(
  "exit",
  (code, signal) => {
    if (signal) {
      process.kill(
        process.pid,
        signal
      );
      return;
    }

    process.exitCode =
      code ?? 1;
  }
);
