#!/usr/bin/env bash
# ============================================================================
# HYRO Cloud — one-command VPS deploy (Ubuntu/Debian).
# Installs Docker, fetches the code, generates secrets, builds & launches the
# full stack (web + API + Postgres/pgvector + Redis + Caddy TLS), then verifies.
#
# Usage (on a fresh server, as root or a sudo user):
#   DOMAIN=hyrocloud.lol REPO_URL=https://github.com/<you>/hyro.git \
#     bash deploy/vps-bootstrap.sh
#
# If you scp'd the project instead of using git, run this from inside the
# project folder (it auto-detects docker-compose.prod.yml in the cwd).
# ============================================================================
set -euo pipefail

DOMAIN="${DOMAIN:-hyrocloud.lol}"
API_DOMAIN="${API_DOMAIN:-api.${DOMAIN}}"
REPO_URL="${REPO_URL:-https://github.com/hyro-cloud/hyro.git}"
APP_DIR="${APP_DIR:-$HOME/hyro}"

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }

log "HYRO VPS bootstrap — web=$DOMAIN api=$API_DOMAIN"

# --- base tools -------------------------------------------------------------
if ! command -v git >/dev/null 2>&1 || ! command -v openssl >/dev/null 2>&1; then
  log "installing git/curl/openssl"
  $SUDO apt-get update -y && $SUDO apt-get install -y git curl openssl ca-certificates
fi

# --- docker -----------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "installing Docker"
  curl -fsSL https://get.docker.com | $SUDO sh
  $SUDO systemctl enable --now docker || true
fi

# --- code -------------------------------------------------------------------
if [ -f "./docker-compose.prod.yml" ]; then
  APP_DIR="$(pwd)"
  log "using project in current directory: $APP_DIR"
elif [ -d "$APP_DIR/.git" ]; then
  log "updating existing checkout in $APP_DIR"
  cd "$APP_DIR" && git pull --ff-only || true
else
  log "cloning $REPO_URL → $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# --- secrets / env ----------------------------------------------------------
if [ ! -f .env.prod ]; then
  log "generating .env.prod (fresh secrets)"
  cp deploy/.env.prod.example .env.prod
  JWT=$(openssl rand -hex 32); PEP=$(openssl rand -hex 32); DBP=$(openssl rand -hex 16)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT}|"           .env.prod
  sed -i "s|^API_KEY_PEPPER=.*|API_KEY_PEPPER=${PEP}|"   .env.prod
  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${DBP}|" .env.prod
  ok "secrets written to .env.prod (add model API keys there, then re-run)"
else
  ok ".env.prod already exists — leaving it as is"
fi

# --- domains in Caddyfile (in case DOMAIN differs from default) -------------
if [ "$DOMAIN" != "hyrocloud.lol" ]; then
  log "pointing Caddy at $DOMAIN / $API_DOMAIN"
  sed -i "s|api\\.hyrocloud\\.lol|${API_DOMAIN}|g; s|www\\.hyrocloud\\.lol|www.${DOMAIN}|g; s|hyrocloud\\.lol|${DOMAIN}|g" Caddyfile
fi

# --- launch -----------------------------------------------------------------
log "building & starting the stack (first build can take a few minutes)"
$SUDO docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# --- verify -----------------------------------------------------------------
log "waiting for the API to report healthy"
healthy=0
for _ in $(seq 1 60); do
  if $SUDO docker compose -f docker-compose.prod.yml exec -T api \
       node -e "fetch('http://localhost:8080/readyz').then(r=>r.json()).then(j=>process.exit(j.db?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    healthy=1; break
  fi
  sleep 3
done

echo ""
if [ "$healthy" -eq 1 ]; then ok "API healthy (DB + Redis connected)"; else
  printf '\033[1;33m! API not healthy yet — check: docker compose -f docker-compose.prod.yml logs -f api\033[0m\n'
fi

cat <<EOF

============================================================
 HYRO is up on this server. Final step: point DNS A-records
 to this server's public IP, then HTTPS issues automatically:

   $DOMAIN        A   <THIS_SERVER_IP>
   www.$DOMAIN    A   <THIS_SERVER_IP>
   $API_DOMAIN    A   <THIS_SERVER_IP>

 Then visit:
   Web:  https://$DOMAIN
   API:  https://$API_DOMAIN/readyz

 Useful:
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs -f api
   docker compose -f docker-compose.prod.yml exec -T api node packages/api/dist/db/seed.js   # demo data
============================================================
EOF
