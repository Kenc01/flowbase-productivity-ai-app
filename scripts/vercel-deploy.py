#!/usr/bin/env python3
"""Deploy Grind OS to Vercel via REST API. vcp_ tokens work here, not with CLI."""

import hashlib, json, os, sys
from pathlib import Path
from urllib import request, error as urlerror

TOKEN       = os.environ["VERCEL_TOKEN"]
PROJECT_ID  = "prj_Ei4MOKsCz8JbBASxHWsziSUi1oEh"
TEAM_ID     = "team_WgTpvCFABHDDH19jaat43Myg"

STATIC_DIR  = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("artifacts/grind-os/dist/public")
API_DIR     = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/tmp/vercel-api")

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


def api(method: str, path: str, body=None, extra_headers=None):
    url = f"https://api.vercel.com{path}?teamId={TEAM_ID}"
    data = json.dumps(body).encode() if body is not None else None
    hdrs = {**HEADERS, **(extra_headers or {})}
    req = request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with request.urlopen(req) as r:
            return json.loads(r.read())
    except urlerror.HTTPError as e:
        body_text = e.read().decode()
        print(f"  HTTP {e.code} {method} {path}: {body_text[:400]}")
        raise


def upload_file(content: bytes, filename: str):
    sha = hashlib.sha1(content).hexdigest()
    url = f"https://api.vercel.com/v2/files?teamId={TEAM_ID}"
    hdrs = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/octet-stream",
        "x-vercel-digest": sha,
    }
    req = request.Request(url, data=content, headers=hdrs, method="POST")
    try:
        with request.urlopen(req) as r:
            r.read()
    except urlerror.HTTPError as e:
        txt = e.read().decode()
        if e.code == 409:
            pass  # already uploaded — fine
        else:
            print(f"  Upload error {e.code} for {filename}: {txt[:200]}")
            raise
    return sha


def collect_files(root: Path, prefix: str):
    files = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        content = p.read_bytes()
        rel = p.relative_to(root).as_posix()
        vercel_path = f"{prefix}{rel}" if prefix else rel
        sha = upload_file(content, vercel_path)
        files.append({"file": vercel_path, "sha": sha})
        print(f"  ✓ {vercel_path}")
    return files


print("─── Uploading static files ───")
static_files = collect_files(STATIC_DIR, "")

print("─── Uploading API bundle ───")
api_files = collect_files(API_DIR, "api/")

all_files = static_files + api_files
print(f"\n→ Creating deployment ({len(all_files)} files)…")

payload = {
    "name": "grind-os",
    "files": all_files,
    "projectId": PROJECT_ID,
    "target": "production",
    "routes": [
        {"src": "^/api(.*)", "dest": "/api/index.mjs"},
        {"handle": "filesystem"},
        {"src": "^/(.*)", "dest": "/index.html"},
    ],
}

result = api("POST", "/v13/deployments", body=payload)
dep_url = result.get("url", "")
dep_id  = result.get("id", "")
dep_state = result.get("readyState", result.get("status", ""))

print(f"\n✓ Deployment created!")
print(f"  ID:    {dep_id}")
print(f"  State: {dep_state}")
print(f"  URL:   https://{dep_url}" if dep_url else "")
print(f"  Live:  https://grind-os-xi.vercel.app")
