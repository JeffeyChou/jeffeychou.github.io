#!/usr/bin/env bash
# Build locally and sync dist/ to the Oracle ARM VPS (fallback host).
# Usage: VPS=user@host deploy/vps.sh      (host directory: /var/www/homepage)
set -euo pipefail
: "${VPS:?set VPS=user@host}"
DEST="${DEST:-/var/www/homepage}"
cd "$(dirname "$0")/.."
pnpm build
rsync -avz --delete dist/ "$VPS:$DEST/"
echo "deployed to $VPS:$DEST"
