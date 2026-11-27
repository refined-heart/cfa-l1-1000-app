#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../v2"
PORT=5173
LOG=/tmp/cfa-v3-preview.log

echo "[V3] Checking preview at http://127.0.0.1:${PORT}/"
if curl --silent --fail --max-time 3 "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
  echo "[V3] Preview already responds on port ${PORT}."
  exit 0
fi

if [ ! -x node_modules/.bin/vite ]; then
  echo "[V3] Installing missing dependencies..."
  npm install --no-audit --no-fund
fi

echo "[V3] Starting Vite on 0.0.0.0:${PORT}; log: ${LOG}"
nohup ./node_modules/.bin/vite --host 0.0.0.0 --port "${PORT}" --strictPort >"${LOG}" 2>&1 </dev/null &
PID=$!
echo "[V3] Spawned PID ${PID}"
for n in $(seq 1 20); do
  if curl --silent --fail --max-time 2 "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    echo "[V3] Ready. Open PORTS -> 5173 -> Open in Browser."
    exit 0
  fi
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "[V3] Preview process stopped. Latest log:"
    tail -n 80 "$LOG" || true
    exit 1
  fi
  sleep 1
done
echo "[V3] Preview did not respond after startup. Latest log:"
tail -n 80 "$LOG" || true
exit 1
