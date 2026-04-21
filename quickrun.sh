#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OLLAMA_LOG="/tmp/llmcraft-ollama.log"
HTTP_LOG="/tmp/llmcraft-http.log"
HTTP_PORT="${HTTP_PORT:-8080}"
OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"

echo "[quickrun] Project root: ${ROOT_DIR}"

# 1) Kill all existing Ollama processes.
echo "[quickrun] Stopping existing Ollama processes..."
pkill -f '^ollama( |$)' >/dev/null 2>&1 || true
pkill -f '/usr/bin/ollama' >/dev/null 2>&1 || true

# 2) Start a clean Ollama server with permissive CORS for local game testing.
echo "[quickrun] Starting Ollama on ${OLLAMA_HOST}..."
nohup env OLLAMA_ORIGINS="*" OLLAMA_HOST="${OLLAMA_HOST}" ollama serve >"${OLLAMA_LOG}" 2>&1 &
OLLAMA_PID=$!

# Wait briefly for Ollama to come up.
for _ in {1..20}; do
  if curl -fsS "http://${OLLAMA_HOST}/api/version" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -fsS "http://${OLLAMA_HOST}/api/version" >/dev/null 2>&1; then
  echo "[quickrun] ERROR: Ollama failed to start. Last logs:"
  tail -n 40 "${OLLAMA_LOG}" || true
  exit 1
fi

# 3) Start Python static server (replace old process on same port).
if command -v fuser >/dev/null 2>&1; then
  echo "[quickrun] Releasing HTTP port ${HTTP_PORT}..."
  fuser -k "${HTTP_PORT}/tcp" >/dev/null 2>&1 || true
fi

echo "[quickrun] Starting Python server on port ${HTTP_PORT}..."
cd "${ROOT_DIR}"
nohup python3 -m http.server "${HTTP_PORT}" >"${HTTP_LOG}" 2>&1 &
HTTP_PID=$!

# Wait briefly for HTTP server.
for _ in {1..20}; do
  if curl -fsS "http://127.0.0.1:${HTTP_PORT}/index.html" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -fsS "http://127.0.0.1:${HTTP_PORT}/index.html" >/dev/null 2>&1; then
  echo "[quickrun] ERROR: Python server failed to start. Last logs:"
  tail -n 40 "${HTTP_LOG}" || true
  exit 1
fi

echo ""
echo "[quickrun] READY"
echo "[quickrun] Ollama PID: ${OLLAMA_PID}"
echo "[quickrun] HTTP PID:   ${HTTP_PID}"
echo "[quickrun] Game URL:   http://localhost:${HTTP_PORT}/index.html"
echo "[quickrun] Ollama:     http://${OLLAMA_HOST}/api/version"
echo "[quickrun] Logs:       ${OLLAMA_LOG} and ${HTTP_LOG}"
