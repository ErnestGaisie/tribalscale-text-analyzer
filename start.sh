#!/usr/bin/env bash
set -e

echo ""
echo "============================================"
echo "  TribalScale Text Analyzer — Bootstrap"
echo "============================================"
echo ""

# ── 1. Check for .env ──────────────────────────────────────────────────────
if [ ! -f .env ]; then
  echo "No .env file found. Copying from .env.example..."
  cp .env.example .env
fi

if grep -q "your_openai_api_key_here" .env; then
  echo "ERROR: OPENAI_API_KEY is not set."
  echo ""
  echo "  Open .env and replace 'your_openai_api_key_here' with your actual key:"
  echo "  https://platform.openai.com/api-keys"
  echo ""
  exit 1
fi

echo "✔ .env is configured"

# ── 2. Start server ────────────────────────────────────────────────────────
if command -v docker &>/dev/null; then
  echo "✔ Docker detected — building and starting container..."
  echo ""
  docker compose up --build
else
  echo "✔ Docker not found — falling back to Node.js..."
  echo ""

  if ! command -v node &>/dev/null; then
    echo "ERROR: Neither Docker nor Node.js is installed."
    echo "  Install Docker: https://docs.docker.com/get-docker/"
    echo "  Install Node.js: https://nodejs.org"
    exit 1
  fi

  echo "Installing dependencies..."
  npm install --silent

  echo "Starting dev server with hot-reload..."
  echo ""
  npm run dev
fi
