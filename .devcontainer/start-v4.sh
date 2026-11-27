#!/usr/bin/env bash
set -euo pipefail
cd /workspaces/cfa-l1-1000-app/v2
LOG=/tmp/knowledge-studio-v4.log
if curl -fsS --max-time 3 http://127.0.0.1:5173/ >/dev/null 2>&1; then
  echo 'V4 preview already available at 5173'
  exit 0
fi
if [ ! -x node_modules/.bin/vite ]; then
  npm install --no-audit --no-fund
fi
nohup ./node_modules/.bin/vite --host 0.0.0.0 --port 5173 --strictPort >"$LOG" 2>&1 < /dev/null &
PID=$!
for i in $(seq 1 20); do
  if curl -fsS --max-time 3 http://127.0.0.1:5173/ >/dev/null 2>&1; then
    echo 'V4 ready: PORTS > 5173 > Open in Browser'
    exit 0
  fi
  if ! kill -0 "$PID" 2>/dev/null; then tail -80 "$LOG"; exit 1; fi
  sleep 1
done
tail -80 "$LOG"
exit 1
