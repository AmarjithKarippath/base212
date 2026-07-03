#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.production ]]; then
  echo "Creating .env.production from .env.production.example"
  cp .env.production.example .env.production
  echo "Update NOVITA_API_KEY in .env.production before deploying."
fi

echo "Building production images..."
docker compose -f docker-compose.prod.yml build

echo "Starting production stack..."
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "Production stack is running on http://127.0.0.1:3009"
echo ""
echo "Configure CloudPanel reverse proxy for www.base212.com → http://127.0.0.1:3009"
echo "See deploy/cloudpanel.conf.example for reference."
echo ""
echo "Logs: docker compose -f docker-compose.prod.yml logs -f"
