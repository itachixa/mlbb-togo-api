#!/usr/bin/env bash
# Démarre MongoDB (replica set mono-nœud, requis par Prisma) si besoin,
# puis lance NestJS en mode watch (rechargement à chaud, façon nodemon).
set -e

DATA="${MLBB_MONGO_DATA:-$HOME/.mlbb-mongo/data}"
SOCK="${MLBB_MONGO_HOME:-$HOME/.mlbb-mongo}"
PORT=27017

is_up() { (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; }

if is_up; then
  echo "✓ MongoDB déjà actif sur $PORT"
else
  if ! command -v mongod >/dev/null 2>&1; then
    echo "✗ mongod introuvable. Installe MongoDB ou démarre-le manuellement." >&2
    exit 1
  fi
  echo "▶ Démarrage de MongoDB (replica set rs0)…"
  mkdir -p "$DATA"
  mongod --dbpath "$DATA" --replSet rs0 --bind_ip 127.0.0.1 --port "$PORT" \
         --unixSocketPrefix "$SOCK" --fork --logpath "$SOCK/mongod.log"
  for _ in $(seq 1 30); do is_up && break; sleep 0.5; done
  # Initialise le replica set au premier lancement (idempotent ensuite).
  mongosh --quiet --port "$PORT" --eval \
    'try { rs.status() } catch (e) { rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "127.0.0.1:27017" }] }) }' \
    >/dev/null 2>&1 || true
  echo "✓ MongoDB prêt"
fi

exec npx nest start --watch
