#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
# Server Monitor Agent — install script
# Usage: bash install.sh [options]
# ──────────────────────────────────────────────

SCRIPT_VERSION="1.0.0"
AGENT_URL="${AGENT_URL:-}"
SERVER_ID="${SERVER_ID:-}"
API_URL="${API_URL:-}"
API_KEY="${API_KEY:-}"
INTERVAL_MS="${INTERVAL_MS:-5000}"
UNINSTALL="${UNINSTALL:-false}"

AGENT_DIR="/opt/server-monitor-agent"
AGENT_BIN="${AGENT_DIR}/agent.js"
CONFIG_DIR="/etc/server-monitor"
CONFIG_FILE="${CONFIG_DIR}/agent.env"
SERVICE_FILE="/etc/systemd/system/server-monitor-agent.service"
AGENT_USER="server-monitor"

# ── helpers ───────────────────────────────────

info()  { printf "\033[36m[INFO]\033[0m %s\n" "$*"; }
ok()    { printf "\033[32m[OK]\033[0m   %s\n" "$*"; }
warn()  { printf "\033[33m[WARN]\033[0m %s\n" "$*"; }
err()   { printf "\033[31m[ERR]\033[0m  %s\n" "$*"; }
fatal() { err "$*"; exit 1; }

usage() {
  cat <<EOF
Server Monitor Agent Installer v${SCRIPT_VERSION}

Usage: bash install.sh [options]

Options:
  --agent-url URL     URL to download agent.js from (required)
  --server-id ID      Unique server identifier (e.g. srv-prod-01)
  --api-url URL       Backend API base URL (e.g. https://monitor.example.com)
  --api-key KEY       Agent API key (must match backend AGENT_API_KEY)
  --interval MS       Metrics collection interval in ms (default: 5000)
  --uninstall         Remove agent and service

All options can also be set via environment variables (AGENT_URL, SERVER_ID, etc.).
EOF
  exit 0
}

# ── parse args ────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent-url)   AGENT_URL="$2";   shift 2 ;;
    --server-id)   SERVER_ID="$2";   shift 2 ;;
    --api-url)     API_URL="$2";     shift 2 ;;
    --api-key)     API_KEY="$2";     shift 2 ;;
    --interval)    INTERVAL_MS="$2"; shift 2 ;;
    --uninstall)   UNINSTALL=true;   shift ;;
    --help|-h)     usage ;;
    *)             fatal "Unknown option: $1 (use --help)" ;;
  esac
done

# ── detect OS ─────────────────────────────────

OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
  Linux)  PKG_CMD="" ;;
  Darwin) PKG_CMD="brew" ;;
  *)      fatal "Unsupported OS: ${OS}. Linux (systemd) or macOS only." ;;
esac

# ── uninstall ─────────────────────────────────

if [[ "${UNINSTALL}" == "true" ]]; then
  info "Stopping and removing service..."
  if [[ -f "${SERVICE_FILE}" ]]; then
    systemctl stop server-monitor-agent 2>/dev/null || true
    systemctl disable server-monitor-agent 2>/dev/null || true
    rm -f "${SERVICE_FILE}"
    systemctl daemon-reload 2>/dev/null || true
  fi
  rm -f "${AGENT_BIN}"
  rm -rf "${CONFIG_DIR}"
  if id "${AGENT_USER}" &>/dev/null 2>&1; then
    userdel -r "${AGENT_USER}" 2>/dev/null || true
  fi
  ok "Agent uninstalled"
  exit 0
fi

# ── check prerequisites ───────────────────────

info "Checking prerequisites..."

NODE_CMD=""
for cmd in node nodejs /usr/local/bin/node /usr/bin/node /opt/homebrew/bin/node /home/linuxbrew/.linuxbrew/bin/node; do
  if command -v "$cmd" &>/dev/null; then
    NODE_CMD="$(command -v "$cmd")"
    break
  fi
done

# Check common NVM locations (avoid node --version which fails under sudo)
if [[ -z "${NODE_CMD}" ]]; then
  for dir in "$HOME/.nvm/versions/node" "$NVM_DIR/versions/node" /root/.nvm/versions/node; do
    if [[ -d "$dir" ]]; then
      candidate="$(ls -t "$dir" 2>/dev/null | head -1)"
      if [[ -n "$candidate" && -x "$dir/$candidate/bin/node" ]]; then
        NODE_CMD="$dir/$candidate/bin/node"
        break
      fi
    fi
  done
fi

# Under sudo, PATH is often restricted — try the original user's PATH
if [[ -z "${NODE_CMD}" && -n "${SUDO_USER:-}" ]]; then
  ORIG_PATH="$(sudo -u "$SUDO_USER" bash -c 'echo "$PATH"' 2>/dev/null)"
  NODE_CMD="$(PATH="$ORIG_PATH" command -v node 2>/dev/null || true)"
fi

if [[ -z "${NODE_CMD}" ]]; then
  fatal "Node.js is not found. Use: sudo -E bash <(curl -sSL ...)"
fi

if [[ -z "${NODE_CMD}" ]]; then
  fatal "Node.js is not installed. Install Node.js >= 18 first: https://nodejs.org"
fi

NODE_MAJOR="$("${NODE_CMD}" -e "console.log(process.versions.node.split('.')[0])")"
if [[ "${NODE_MAJOR}" -lt 18 ]]; then
  fatal "Node.js >= 18 required, found $("${NODE_CMD}" --version)"
fi
ok "Node.js $("${NODE_CMD}" --version)"

if [[ "${OS}" == "Linux" ]] && ! command -v systemctl &>/dev/null; then
  warn "systemctl not found — skipping service installation"
  SKIP_SERVICE=true
else
  SKIP_SERVICE=false
fi

# ── validate required params ──────────────────

if [[ -z "${AGENT_URL}" ]]; then
  if [[ -z "${API_URL}" ]]; then
    API_URL="__BACKEND_URL__"
  fi
  AGENT_URL="${API_URL}/agent.js"
fi

[[ -z "${SERVER_ID}" ]] && SERVER_ID="srv-$(hostname | tr '[:upper:]' '[:lower:]')"
[[ -z "${API_KEY}" ]] && warn "No API_KEY set — agent will fail unless backend AGENT_API_KEY is empty"

# ── download agent ────────────────────────────

info "Downloading agent from ${AGENT_URL} ..."
mkdir -p "${AGENT_DIR}"
if command -v curl &>/dev/null; then
  curl -fsSL -o "${AGENT_BIN}" "${AGENT_URL}" || fatal "Download failed"
elif command -v wget &>/dev/null; then
  wget -q -O "${AGENT_BIN}" "${AGENT_URL}" || fatal "Download failed"
else
  fatal "Neither curl nor wget found. Install one of them first."
fi
chmod +x "${AGENT_BIN}"
if id "${AGENT_USER}" &>/dev/null 2>&1; then
  chown -R "${AGENT_USER}:${AGENT_USER}" "${AGENT_DIR}"
fi
ok "Agent saved to ${AGENT_BIN}"

# ── create config ─────────────────────────────

info "Creating configuration..."
mkdir -p "${CONFIG_DIR}"
cat > "${CONFIG_FILE}" <<EOF
# Server Monitor Agent Configuration
# Generated by install.sh v${SCRIPT_VERSION}
SERVER_ID=${SERVER_ID}
API_URL=${API_URL}
API_KEY=${API_KEY}
INTERVAL_MS=${INTERVAL_MS}
EOF
chmod 600 "${CONFIG_FILE}"
ok "Config written to ${CONFIG_FILE}"

# ── systemd service ───────────────────────────

if [[ "${SKIP_SERVICE}" == "false" ]]; then
  info "Installing systemd service..."

  if ! id "${AGENT_USER}" &>/dev/null 2>&1; then
    useradd --system --no-create-home --shell /usr/sbin/nologin "${AGENT_USER}" 2>/dev/null || true
  fi

  cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=Server Monitor Agent
Documentation=https://github.com/raf1n/server-monitor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${AGENT_USER}
WorkingDirectory=${AGENT_DIR}
ExecStart=${NODE_CMD} ${AGENT_BIN}
EnvironmentFile=${CONFIG_FILE}
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=server-monitor-agent

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable server-monitor-agent
  systemctl start server-monitor-agent
  ok "Service installed and started"
fi

# ── done ──────────────────────────────────────

echo ""
ok "Server Monitor Agent installed successfully!"
echo ""
echo "  Server ID:  ${SERVER_ID}"
echo "  Config:     ${CONFIG_FILE}"
echo "  Binary:     ${AGENT_BIN}"
echo ""
if [[ "${SKIP_SERVICE}" == "false" ]]; then
  echo "  Service:    server-monitor-agent"
  echo "  Status:     systemctl status server-monitor-agent"
  echo "  Logs:       journalctl -u server-monitor-agent -f"
fi
echo ""
info "Make sure the backend AGENT_API_KEY matches the API_KEY above."
