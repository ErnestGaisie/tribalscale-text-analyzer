#!/usr/bin/env bash
set -e

BASE_URL="http://localhost:3000"

echo ""
echo "============================================"
echo "  TribalScale Text Analyzer — Demo Script"
echo "============================================"
echo ""

# ── 1. Check for .env ──────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "No .env file found. Copying from .env.example..."
  cp .env.example .env
fi

if grep -q "your_openai_api_key_here" .env; then
  echo "ERROR: Please add your OPENAI_API_KEY to .env before running this script."
  echo "  Open .env and replace 'your_openai_api_key_here' with your actual key."
  exit 1
fi

# ── 2. Start the server ────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  echo "Starting server with Docker..."
  docker compose up --build -d
  echo "Waiting for server to be ready..."
  until curl -sf "$BASE_URL/health" >/dev/null 2>&1; do sleep 1; done
else
  echo "Docker not found. Starting with npm..."
  npm install --silent
  npm run build --silent
  node dist/index.js &
  SERVER_PID=$!
  echo "Waiting for server to be ready..."
  until curl -sf "$BASE_URL/health" >/dev/null 2>&1; do sleep 1; done
fi

echo ""
echo "Server is up at $BASE_URL"
echo ""

# ── 3. Health check ────────────────────────────────────────────────────────
echo "--------------------------------------------"
echo " GET /health"
echo "--------------------------------------------"
curl -s "$BASE_URL/health" | python3 -m json.tool 2>/dev/null || curl -s "$BASE_URL/health"
echo ""

# ── 4. Happy path ──────────────────────────────────────────────────────────
echo "--------------------------------------------"
echo " POST /api/analyze — valid text"
echo "--------------------------------------------"
curl -s -X POST "$BASE_URL/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"text": "Our Q3 revenue missed targets by 12%. The sales team needs to improve pipeline quality, marketing should increase lead generation efforts, and leadership must review pricing strategy before Q4."}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"text": "Our Q3 revenue missed targets by 12%. The sales team needs to improve pipeline quality, marketing should increase lead generation efforts, and leadership must review pricing strategy before Q4."}'
echo ""

# ── 5. Error — missing text ────────────────────────────────────────────────
echo "--------------------------------------------"
echo " POST /api/analyze — missing text (expect 400)"
echo "--------------------------------------------"
curl -s -X POST "$BASE_URL/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/analyze" -H "Content-Type: application/json" -d '{}'
echo ""

# ── 6. Error — empty string ────────────────────────────────────────────────
echo "--------------------------------------------"
echo " POST /api/analyze — empty string (expect 400)"
echo "--------------------------------------------"
curl -s -X POST "$BASE_URL/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"text": ""}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/analyze" -H "Content-Type: application/json" -d '{"text": ""}'
echo ""

# ── 7. Error — wrong type ──────────────────────────────────────────────────
echo "--------------------------------------------"
echo " POST /api/analyze — wrong type (expect 400)"
echo "--------------------------------------------"
curl -s -X POST "$BASE_URL/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{"text": 12345}' \
  | python3 -m json.tool 2>/dev/null || curl -s -X POST "$BASE_URL/api/analyze" -H "Content-Type: application/json" -d '{"text": 12345}'
echo ""

# ── 8. Cleanup ─────────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  echo "Stopping Docker container..."
  docker compose down
else
  kill "$SERVER_PID" 2>/dev/null || true
fi

echo ""
echo "============================================"
echo "  Demo complete."
echo "============================================"
echo ""
