import { readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["src", "server", "scripts", "test", "extension"];
const sourceFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(full);
    } else if (extname(entry.name) === ".mjs") {
      sourceFiles.push(full);
    }
  }
}

for (const root of roots) {
  await walk(resolve(root));
}

const failures = [];

for (const file of sourceFiles) {
  const check = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8"
  });

  if (check.status !== 0) {
    failures.push(`${file}\n${check.stderr || check.stdout}`);
    continue;
  }

  const text = await readFile(file, "utf8");

  if (/\r/.test(text)) {
    failures.push(`${file}: CR/CRLF detected; repository text files must use LF.`);
  }

  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      failures.push(`${file}:${index + 1}: trailing whitespace.`);
    }
  });
}

if (failures.length > 0) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log(`Lint passed for ${sourceFiles.length} module(s).`);
