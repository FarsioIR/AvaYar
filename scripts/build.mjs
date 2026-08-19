import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const dist = resolve(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await cp(resolve(root, "public"), dist, { recursive: true });
await cp(resolve(root, "src"), resolve(dist, "src"), { recursive: true });

console.log(`Built Ava browser client into ${dist}`);
console.log("Server-side keyless providers remain in server/ and run via scripts/dev-server.mjs.");
