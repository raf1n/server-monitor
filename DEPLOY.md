# Deployment Guide

## Architecture

Nginx on the host serves the frontend static files directly and proxies API/WebSocket requests to the backend Docker container.

```
Client (browser)
  │
  ▼
Nginx (port 443, SSL termination)
  ├── /             → serves dist/index.html (React SPA)
  ├── /assets/*     → serves static files from dist/
  ├── /api/*        → proxy_pass http://localhost:3300
  ├── /socket.io/*  → proxy_pass http://localhost:3300 (WebSocket)
  └── /ingest, /health, /agent.js, /install.sh → proxy_pass http://localhost:3300
  │
  ▼
Backend (Docker, port 3300)
  ├── PostgreSQL (TimescaleDB) — internal
  └── Redis — internal
```

## Step 1: Clone and configure

```bash
git clone <your-repo> server-monitor
cd server-monitor
```

Create `.env`:

```bash
cat > .env << 'EOF'
JWT_SECRET=$(openssl rand -hex 64)
ADMIN_PASSWORD=<your-strong-password>
CORS_ORIGIN=https://monitor.your-domain.com
EOF
```

> `AGENT_API_KEY` is optional. Per-server keys are managed from the dashboard (see Adding Agents below).

## Step 2: Build frontend locally

```bash
# Empty VITE_API_URL = same-origin mode (API calls go to /api/ on the same domain)
VITE_API_URL= VITE_SOCKET_URL= pnpm build:frontend
```

This produces `apps/frontend/dist/` with the static SPA.

## Step 3: Copy dist to VPS

```bash
# Create the directory on VPS
ssh user@your-vps "mkdir -p /var/www/server-monitor-frontend"

# Copy files
scp -r apps/frontend/dist/* user@your-vps:/var/www/server-monitor-frontend/
```

## Step 4: Start backend + databases on VPS

```bash
docker compose -f docker-compose.prod.yml up -d
```

This starts 3 containers: **backend** (:3300), **postgres**, **redis**. No frontend container — nginx handles that.

## Step 5: Install and configure nginx

```bash
apt install nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/server-monitor`:

```nginx
server {
    listen 80;
    server_name monitor.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name monitor.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/monitor.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.your-domain.com/privkey.pem;

    root /var/www/server-monitor-frontend;
    index index.html;

    # Frontend — serve static files, SPA fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets (Vite output is content-hashed)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Public endpoints (no /api/ prefix — excluded in backend)
    location ~ ^/(ingest|health|agent\.js|install\.sh|agent-info)$ {
        proxy_pass http://localhost:3300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/server-monitor /etc/nginx/sites-enabled/
certbot --nginx -d monitor.your-domain.com
nginx -t && systemctl reload nginx
```

## Step 6: Open firewall

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Step 7: Verify

```bash
curl https://monitor.your-domain.com/health
# Should return: {"status":"ok","checks":{...}}
```

Login at `https://monitor.your-domain.com` with username `admin` and your `ADMIN_PASSWORD`.

## Adding Agents to Monitor

Each agent needs its own API key. There are two ways to authenticate agents:

### Per-server keys (recommended)

1. Log in to the dashboard as admin
2. Go to **API Keys** in the sidebar
3. Click **Create Key**, optionally scope it to a server ID and give it a label
4. Copy the key (shown only once) and share it with the server owner

On the server to monitor (must have Node.js 18+):

```bash
# Using the install script
bash <(curl -fsSL https://monitor.your-domain.com/install.sh) \
  --server-id srv-my-vps-01 \
  --api-url https://monitor.your-domain.com \
  --api-key <paste-the-key-from-dashboard>

# Or manually:
curl -O https://monitor.your-domain.com/agent.js
chmod +x agent.js
SERVER_ID=srv-my-vps-01 \
API_URL=https://monitor.your-domain.com \
API_KEY=<paste-the-key-from-dashboard> \
INTERVAL_MS=5000 \
node agent.js
```

The agent auto-installs as a systemd service with the install script.

### Master key (optional, for your own servers)

You can set `AGENT_API_KEY` in your `.env` as a shared master key. This key works for all servers without creating individual keys in the dashboard — useful for your own infrastructure where you don't need per-server revocation.

```bash
# In .env
AGENT_API_KEY=$(openssl rand -hex 32)
```

Agents using the master key and agents using per-server keys can coexist. The ingest endpoint checks the master key first, then falls back to per-server keys in the database.

## Redeploying frontend after changes

```bash
# On your dev machine
VITE_API_URL= VITE_SOCKET_URL= pnpm build:frontend
scp -r apps/frontend/dist/* user@your-vps:/var/www/server-monitor-frontend/
```

No restart needed — nginx serves the files directly. Users get the new version on next page load.

## Security Checklist

- [ ] Strong `JWT_SECRET` (at least 64 chars random)
- [ ] Strong `ADMIN_PASSWORD`
- [ ] Per-server API keys created from the dashboard (not the shared master key)
- [ ] Revoke keys immediately when a server is decommissioned
- [ ] HTTPS via Let's Encrypt
- [ ] Database backups configured (`pg_dump` or volume snapshots)
- [ ] VPS firewall: only ports 443 (HTTPS) and 22 (SSH) open
- [ ] `ALLOW_REGISTRATION=false` (default) — no open sign-ups
- [ ] Regular `docker compose pull` to update images
