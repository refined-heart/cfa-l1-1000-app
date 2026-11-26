#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../v2"
if curl -sf --max-time 2 http://127.0.0.1:5173/ >/dev/null 2>&1; then
  echo 'V2 preview already running on 5173'
  exit 0
fi
nohup bash -lc 'npm run dev' </dev/null >/tmp/cfa-v2-preview.log 2>&1 &
echo 'V2 preview is starting on port 5173. Use PORTS -> 5173 -> Open in Browser.'
