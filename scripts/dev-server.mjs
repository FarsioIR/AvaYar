import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { createApiHandler } from "../server/api.mjs";

function parseArgs(argv) {
  const result = {
    root: process.cwd(),
    port: 4173
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      result.root = resolve(argv[index + 1]);
      index += 1;
    } else if (argv[index] === "--port") {
      result.port = Number(argv[index + 1]);
      index += 1;
    }
  }

  return result;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const { root, port } = parseArgs(process.argv.slice(2));
const isDist = root.endsWith(`${sep}dist`);
const handleApi = createApiHandler();

function safePath(requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);

  if (decoded.includes("..")) {
    return null;
  }

  if (decoded === "/") {
    return isDist
      ? resolve(root, "index.html")
      : resolve(root, "public", "index.html");
  }

  if (!isDist && decoded === "/styles.css") {
    return resolve(root, "public", "styles.css");
  }

  return resolve(root, decoded.replace(/^\/+/, ""));
}

const server = createServer(async (request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: true, product: "ava" }));
    return;
  }

  if (await handleApi(request, response)) {
    return;
  }

  const filePath = safePath(request.url ?? "/");

  if (!filePath || !filePath.startsWith(root)) {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      throw new Error("Not a file");
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": MIME[extname(filePath)] ?? "application/octet-stream"
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Ava server: http://127.0.0.1:${port}`);
});

if (process.env.AVA_PRINT_PID === "1") {
  console.log(`PID=${process.pid}`);
}
