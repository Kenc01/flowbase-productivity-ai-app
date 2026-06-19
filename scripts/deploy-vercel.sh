#!/usr/bin/env bash
# Deploy Grind OS to Vercel via REST API
# Usage: bash scripts/deploy-vercel.sh
# Requires: VERCEL_TOKEN env var (full personal access token, starts with vcp_)

set -e

ESBUILD="/home/runner/workspace/node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild/bin/esbuild"
API_SERVER_DIR="/home/runner/workspace/artifacts/api-server"
STATIC_ROOT="/home/runner/workspace/artifacts/grind-os/dist/public"
BUILD_DIR="/tmp/vercel-deploy-$(date +%s)"

echo "→ Building frontend..."
BASE_PATH=/ pnpm --filter @workspace/grind-os run build

echo "→ Building API serverless bundle..."
mkdir -p "$BUILD_DIR"
cd "$API_SERVER_DIR"
node --input-type=module << 'JSEOF'
import { createRequire } from "node:module";
import { build } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
globalThis.require = createRequire(new URL(import.meta.url));

const outdir = process.env.BUILD_DIR;
await build({
  entryPoints: ["src/vercel-entry.ts"],
  platform: "node", bundle: true, format: "esm",
  outdir, outExtension: { ".js": ".mjs" },
  logLevel: "warning",
  external: [
    "*.node","sharp","better-sqlite3","sqlite3","canvas","bcrypt","argon2",
    "fsevents","re2","bufferutil","utf-8-validate","pg-native","nodemailer",
    "@google-cloud/*","@google/*","googleapis","firebase-admin","@aws-sdk/*","dd-trace",
  ],
  sourcemap: false,
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: { js: `import { createRequire as __crq } from 'node:module';
import __pth from 'node:path'; import __url from 'node:url';
globalThis.require = __crq(import.meta.url);
globalThis.__filename = __url.fileURLToPath(import.meta.url);
globalThis.__dirname = __pth.dirname(globalThis.__filename);
`},
});
JSEOF

echo "→ Deploying to Vercel..."
python3 /home/runner/workspace/scripts/vercel-deploy.py "$STATIC_ROOT" "$BUILD_DIR"
