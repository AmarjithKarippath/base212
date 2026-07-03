#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
POSTGRES_USER="${POSTGRES_USER:-base212}"
POSTGRES_DB="${POSTGRES_DB:-base212}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT="${BACKUP_DIR}/base212-${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

if ! docker compose -f "$COMPOSE_FILE" ps --status running db >/dev/null 2>&1; then
  echo "Database container is not running. Start the stack first."
  exit 1
fi

docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$OUTPUT"

echo "Backup saved to $OUTPUT"
