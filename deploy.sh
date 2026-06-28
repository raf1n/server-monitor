#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Server Monitor — VPS Deployment Script
# ─────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; }
info()  { echo -e "${CYAN}[i]${NC} $1"; }

# ─────────────────────────────────────────────
# Collect inputs
# ─────────────────────────────────────────────

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       Server Monitor — Deploy Script     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

if [ -z "${DOMAIN:-}" ]; then
  read -rp "Domain (e.g. monitor.example.com): " DOMAIN
fi
if [ -z "$DOMAIN" ]; then
  err "Domain is required."
  exit 1
fi

if [ -z "${ADMIN_PASSWORD:-}" ]; then
  read -rsp "Admin password: " ADMIN_PASSWORD
  echo ""
fi
if [ -z "$ADMIN_PASSWORD" ]; then
  err "Admin password is required."
  exit 1
fi

if [ -z "${AGENT_API_KEY:-}" ]; then
  AGENT_API_KEY=$(openssl rand -hex 32)
  log "Generated AGENT_API_KEY: ${AGENT_API_KEY}"
fi

if [ -z "${REDIS_PASSWORD:-}" ]; then
  REDIS_PASSWORD=$(openssl rand -hex 32)
  log "Generated REDIS_PASSWORD: ${REDIS_PASSWORD}"
fi

if [ -z "${DB_PASSWORD:-}" ]; then
  DB_PASSWORD=$(openssl rand -hex 32)
  log "Generated DB_PASSWORD: ${DB_PASSWORD}"
fi

REPO_URL="${REPO_URL:-}"
INSTALL_DIR="${INSTALL_DIR:-/opt/server-monitor}"
FRONTEND_DIR="${FRONTEND_DIR:-/var/www/server-monitor-frontend}"

# ─────────────────────────────────────────────
# 1. System dependencies
# ─────────────────────────────────────────────

info "Checking system dependencies..."

# Docker
if ! command -v docker &>/dev/null; then
  info "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  log "Docker installed"
else
  log "Docker already installed"
fi

# Docker Compose (plugin)
if ! docker compose version &>/dev/null; then
  err "docker compose plugin not found. Update Docker or install the compose plugin."
  exit 1
fi

# Node.js (needed for frontend build)
if ! command -v node &>/dev/null; then
  info "Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
  log "Node.js installed"
else
  log "Node.js $(node -v) already installed"
fi

# pnpm
if ! command -v pnpm &>/dev/null; then
  info "Installing pnpm..."
  npm install -g pnpm
  log "pnpm installed"
else
  log "pnpm already installed"
fi

# ─────────────────────────────────────────────
# 2. Clone or update repo
# ─────────────────────────────────────────────

if [ -d "$INSTALL_DIR/.git" ]; then
  info "Updating existing repo at $INSTALL_DIR..."
  cd "$INSTALL_DIR"
  git pull --ff-only
  log "Repo updated"
elif [ -n "$REPO_URL" ]; then
  info "Cloning repo..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
  log "Repo cloned"
else
  # Script is being run from inside the repo
  if [ -f "package.json" ] && [ -f "docker-compose.prod.yml" ]; then
    INSTALL_DIR="$(pwd)"
    info "Running from repo directory: $INSTALL_DIR"
  else
    err "REPO_URL not set and not inside the repo directory."
    err "Run this script from the repo root, or set REPO_URL=https://github.com/raf1n/server-monitor.git"
    exit 1
  fi
fi

# ─────────────────────────────────────────────
# 3. Generate .env
# ─────────────────────────────────────────────

if [ -f .env ] && grep -q "JWT_SECRET=" .env && [ -n "$(grep JWT_SECRET .env | cut -d= -f2)" ] && [ -n "$(grep DB_PASSWORD .env | cut -d= -f2)" ]; then
  warn ".env already exists with JWT_SECRET set — skipping generation"
  source .env 2>/dev/null || true
else
  info "Generating secrets..."
  JWT_SECRET=$(openssl rand -hex 64)

  cat > .env <<EOF
JWT_SECRET=${JWT_SECRET}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
AGENT_API_KEY=${AGENT_API_KEY}
REDIS_PASSWORD=${REDIS_PASSWORD}
DB_PASSWORD=${DB_PASSWORD}
CORS_ORIGIN=https://${DOMAIN}
DB_SYNCHRONIZE=true
EOF
  log ".env created"
fi

# ─────────────────────────────────────────────
# 4. Install dependencies and build frontend
# ─────────────────────────────────────────────

info "Installing dependencies..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

info "Building shared package..."
pnpm build:shared

info "Building frontend (same-origin mode)..."
VITE_API_URL= VITE_SOCKET_URL= pnpm build:frontend

log "Frontend built"

# ─────────────────────────────────────────────
# 5. Deploy frontend static files
# ─────────────────────────────────────────────

if [ "$INSTALL_DIR" = "$FRONTEND_DIR" ]; then
  err "INSTALL_DIR ($INSTALL_DIR) and FRONTEND_DIR ($FRONTEND_DIR) must be different."
  err "The frontend files would overwrite the repo. Run with a separate FRONTEND_DIR:"
  err "  INSTALL_DIR=/opt/server-monitor FRONTEND_DIR=$FRONTEND_DIR bash deploy.sh"
  exit 1
fi

info "Deploying frontend to $FRONTEND_DIR..."
mkdir -p "$FRONTEND_DIR"
TMP_DIST=$(mktemp -d)
cp -r apps/frontend/dist/* "$TMP_DIST/"
rm -rf "${FRONTEND_DIR:?}"/*
cp -r "$TMP_DIST"/* "$FRONTEND_DIR/"
rm -rf "$TMP_DIST"
log "Frontend deployed to $FRONTEND_DIR"

# ─────────────────────────────────────────────
# 6. Start backend containers
# ─────────────────────────────────────────────

info "Starting backend containers..."
docker compose -f docker-compose.prod.yml up -d --build
log "Backend containers started"

# Wait for backend health
info "Waiting for backend to be healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3300/health >/dev/null 2>&1; then
    log "Backend is healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    warn "Backend health check timed out — check with: docker compose -f docker-compose.prod.yml logs backend"
  fi
  sleep 2
done

# ─────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Deployment Complete!              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Dashboard:  ${CYAN}https://${DOMAIN}${NC}"
echo -e "  Username:   ${CYAN}admin${NC}"
echo -e "  Password:   ${YELLOW}(set above)${NC}"
echo -e "  Backend:    ${CYAN}http://localhost:3300${NC}"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  1. Configure nginx — see nginx.md"
echo -e "  2. Log in and go to API Keys to create per-server keys"
echo -e "  3. Install agents on your servers (see DEPLOY.md)"
echo ""
