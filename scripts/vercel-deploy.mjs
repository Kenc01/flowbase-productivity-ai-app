#!/usr/bin/env node
/**
 * Deploy Grind OS to Vercel via REST API.
 * vcp_ tokens work with the REST API but NOT with the CLI.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";

const TOKEN      = process.env.VERCEL_TOKEN;
const PROJECT_ID = "prj_Ei4MOKsCz8JbBASxHWsziSUi1oEh";
const TEAM_ID    = "team_WgTpvCFABHDDH19jaat43Myg";
const STATIC_DIR = process.argv[2] ?? "artifacts/grind-os/dist/public";
const API_DIR    = process.argv[3] ?? "/tmp/vercel-api";

if (!TOKEN) { console.error("VERCEL_TOKEN not set"); process.exit(1); }

async function vercelApi(method, path, body, extraHeaders = {}) {
  const url = `https://api.vercel.com${path}?teamId=${TEAM_ID}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`  HTTP ${res.status} ${method} ${path}: ${text.slice(0, 400)}`);
    throw new Error(`Vercel API error ${res.status}`);
  }
  return JSON.parse(text);
}

async function uploadFile(content, name) {
  const sha = createHash("sha1").update(content).digest("hex");
  const url = `https://api.vercel.com/v2/files?teamId=${TEAM_ID}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/octet-stream",
      "x-vercel-digest": sha,
    },
    body: content,
  });
  if (!res.ok && res.status !== 409) {
    const t = await res.text();
    console.error(`  Upload error ${res.status} for ${name}: ${t.slice(0, 200)}`);
    throw new Error(`Upload failed for ${name}`);
  }
  await res.text(); // drain
  return sha;
}

function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function collectFiles(rootDir, prefix) {
  const files = [];
  for (const fullPath of walk(rootDir)) {
    const content = readFileSync(fullPath);
    const rel = fullPath.slice(rootDir.length).replace(/^\//, "");
    const vercelPath = prefix ? `${prefix}/${rel}` : rel;
    const sha = await uploadFile(content, vercelPath);
    files.push({ file: vercelPath, sha });
    console.log(`  ✓ ${vercelPath}`);
  }
  return files;
}

console.log("─── Uploading static files ───");
const staticFiles = await collectFiles(resolve(STATIC_DIR), "");

console.log("─── Uploading API bundle ───");
const apiFiles = await collectFiles(resolve(API_DIR), "api");

const allFiles = [...staticFiles, ...apiFiles];
console.log(`\n→ Creating deployment (${allFiles.length} files)…`);

const result = await vercelApi("POST", "/v13/deployments", {
  name: "grind-os",
  files: allFiles,
  projectId: PROJECT_ID,
  target: "production",
  routes: [
    { src: "^/api(.*)", dest: "/api/index.mjs" },
    { handle: "filesystem" },
    { src: "^/(.*)", dest: "/index.html" },
  ],
});

const { id, url, readyState } = result;
console.log(`\n✓ Deployment created!`);
console.log(`  ID:    ${id}`);
console.log(`  State: ${readyState}`);
console.log(`  URL:   https://${url}`);
console.log(`  Live:  https://grind-os-xi.vercel.app`);
