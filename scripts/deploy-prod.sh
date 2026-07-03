#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.production ]]; then
  echo "Creating .env.production from .env.production.example"
  cp .env.production.example .env.production
  echo "Update NOVITA_API_KEY in .env.production before deploying."
fi

echo "Building production images for www.base212.com..."
docker compose -f docker-compose.prod.yml build

echo "Starting production stack..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "Production stack is running."
echo "  App:  https://www.base212.com"
echo "  Logs: docker compose -f docker-compose.prod.yml logs -f"
