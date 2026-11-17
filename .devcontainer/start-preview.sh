#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Do not start duplicate Metro instances when Codespaces resumes.
if curl --silent --fail --max-time 2 http://127.0.0.1:8081/ >/dev/null 2>&1; then
  echo "CFA browser preview is already serving on port 8081."
  exit 0
fi

nohup bash -lc "cd '$ROOT' && npm run start:web" </dev/null >/tmp/cfa-preview.log 2>&1 &
echo "CFA web preview starting on port 8081. Open the forwarded Ports tab."
echo "Server log: /tmp/cfa-preview.log"
