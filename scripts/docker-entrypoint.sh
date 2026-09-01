#!/bin/sh
set -e

if [ -z "$AUTH_SECRET" ] || [ "${#AUTH_SECRET}" -lt 32 ]; then
  echo "[AUDION-v3] AUTH_SECRET is missing or shorter than 32 chars (Runtime env). Refusing to start."
  exit 1
fi

if [ -n "$DATABASE_URL" ]; then
  echo "[AUDION-v3] Checking DATABASE_URL..."
  node ./scripts/check-database-url.mjs

  echo "[AUDION-v3] Running drizzle-kit push (projects schema)..."
  if npm run db:push -w web; then
    echo "[AUDION-v3] Schema up to date."
  else
    echo "[AUDION-v3] drizzle-kit push failed (DB unreachable or schema error). Refusing to start."
    exit 1
  fi

  echo "[AUDION-v3] Vaillant Group MaFo persona seed (idempotent)..."
  if npx tsx scripts/seed-vaillant-group-mafo-store.ts; then
    echo "[AUDION-v3] Vaillant Group seed complete."
  else
    echo "[AUDION-v3] Vaillant Group seed failed (non-fatal)."
  fi
else
  echo "[AUDION-v3] DATABASE_URL not set — projects use in-memory fixtures (dev only)."
fi

exec npm run start -w web
