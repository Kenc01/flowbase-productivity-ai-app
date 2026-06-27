#!/usr/bin/env node
/**
 * Vercel build script — runs during `vercel --prod` via buildCommand.
 * 1. Builds the React frontend  →  dist/  (Vercel outputDirectory)
 * 2. Bundles the Express API    →  api/index.mjs  (Vercel serverless function)
 */

import { execSync } from "node:child_process";
import { mkdirSync, cpSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

globalThis.require = createRequire(import.meta.url);

// ── 1. Frontend ───────────────────────────────────────────────────────────────
console.log("→ Building frontend…");
execSync("BASE_PATH=/ pnpm --filter @workspace/grind-os run build", {
  stdio: "inherit",
  cwd: root,
});

console.log("→ Copying frontend to dist/…");
mkdirSync(resolve(root, "dist"), { recursive: true });
cpSync(
  resolve(root, "artifacts/grind-os/dist/public"),
  resolve(root, "dist"),
  { recursive: true }
);

// ── 2. API serverless bundle ──────────────────────────────────────────────────
console.log("→ Building API serverless bundle…");
mkdirSync(resolve(root, "api"), { recursive: true });

await build({
  entryPoints: [resolve(root, "artifacts/api-server/src/vercel-entry.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: resolve(root, "api/index.mjs"),
  logLevel: "warning",
  external: [
    "*.node", "sharp", "better-sqlite3", "sqlite3", "canvas",
    "bcrypt", "argon2", "fsevents", "re2", "farmhash", "xxhash-addon",
    "bufferutil", "utf-8-validate", "ssh2", "cpu-features", "dtrace-provider",
    "isolated-vm", "lightningcss", "pg-native", "oracledb",
    "mongodb-client-encryption", "nodemailer", "handlebars", "knex", "typeorm",
    "protobufjs", "onnxruntime-node", "@tensorflow/*", "@prisma/client",
    "@mikro-orm/*", "@grpc/*", "@swc/*", "@aws-sdk/*", "@azure/*",
    "@opentelemetry/*", "@google-cloud/*", "googleapis", "firebase-admin",
    "@parcel/watcher", "@sentry/profiling-node", "@tree-sitter/*", "aws-sdk",
    "classic-level", "dd-trace", "ffi-napi", "grpc", "hiredis", "kerberos",
    "leveldown", "miniflare", "mysql2", "newrelic", "odbc", "piscina",
    "realm", "ref-napi", "rocksdb", "sass-embedded", "sequelize",
    "serialport", "snappy", "tinypool", "usb", "workerd", "wrangler",
    "zeromq", "zeromq-prebuilt", "playwright", "puppeteer", "puppeteer-core",
    "electron",
  ],
  sourcemap: false,
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: `import { createRequire as __crq } from 'node:module';
import __pth from 'node:path';
import __url from 'node:url';
globalThis.require = __crq(import.meta.url);
globalThis.__filename = __url.fileURLToPath(import.meta.url);
globalThis.__dirname = __pth.dirname(globalThis.__filename);
`,
  },
});

console.log("✓ Vercel build complete.");
