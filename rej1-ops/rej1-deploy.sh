#!/bin/bash
# Deploy this checkout (already built: node_modules + client/dist) as the Audiobookshelf service.
# Run as root:  sudo bash rej1-ops/rej1-deploy.sh
# Rollback:     sudo bash rej1-ops/rej1-deploy.sh --rollback   (back to the Arch package's /usr/lib/audiobookshelf)
set -euo pipefail
SRC=$(cd "$(dirname "$0")/.." && pwd)
BASE=/opt/audiobookshelf-rej1
DROPIN=/etc/systemd/system/audiobookshelf.service.d/rej1-fork.conf
DB=/var/lib/audiobookshelf/config/absdatabase.sqlite

health() { for i in $(seq 1 40); do curl -fsS http://127.0.0.1:13378/status 2>/dev/null | grep -q '"isInit":true' && return 0; sleep 1; done; return 1; }

if [ "${1:-}" = "--rollback" ]; then
  rm -f "$DROPIN"; systemctl daemon-reload; systemctl restart audiobookshelf; health && echo "ROLLED BACK to package build"; exit 0
fi

[ -d "$SRC/client/dist" ] && [ -d "$SRC/node_modules" ] || { echo "build first: node_modules and client/dist missing"; exit 1; }
SHA=$(git -C "$SRC" rev-parse --short HEAD); REL=$BASE/releases/$SHA
install -d -m 0755 "$BASE/releases" "$BASE/backups"

# 1. consistent DB backup before the new server touches (and possibly migrates) the database
python3 - <<PY
import sqlite3
src=sqlite3.connect("file:$DB?mode=ro",uri=True); dst=sqlite3.connect("$BASE/backups/absdatabase-pre-$SHA.sqlite"); src.backup(dst); dst.close()
PY
chmod 600 "$BASE/backups/absdatabase-pre-$SHA.sqlite"

# 2. release directory (server code, built client, production deps)
rm -rf "$REL"; mkdir -p "$REL/client"
cp -a "$SRC/index.js" "$SRC/package.json" "$SRC/server" "$SRC/node_modules" "$REL/"
cp -a "$SRC/client/dist" "$REL/client/dist"
chown -R root:root "$REL"; ln -sfn "$REL" "$BASE/current"

# 3. systemd drop-in: same service, user, env and node as before, different code directory
install -d /etc/systemd/system/audiobookshelf.service.d
printf '[Service]\nExecStart=\nExecStart=/usr/local/bin/node24 %s/current/index.js\n' "$BASE" > "$DROPIN"
systemctl daemon-reload; systemctl restart audiobookshelf
if health; then echo "OK: running fork $SHA"; else echo "UNHEALTHY: rolling back"; bash "$0" --rollback; exit 1; fi
