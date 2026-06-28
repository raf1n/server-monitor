# Server Monitor

Real-time server monitoring and observability platform — lightweight, self-hosted, inspired by Datadog.

Collects CPU, memory, disk, network, and process metrics from multiple servers via a lightweight agent, streams them through a NestJS backend with Redis queueing and TimescaleDB storage, and visualizes everything in a real-time React dashboard.

## Architecture

```
┌──────────┐   POST /ingest    ┌──────────┐   subscribe   ┌──────────┐
│  Agent   │ ──────────────────→│ Backend  │ ←──────────── │ Frontend │
│ (per VPS)│   (per-server key) │ (NestJS) │  (Socket.IO)  │ (React)  │
└──────────┘                    ├──────────┤               └──────────┘
                                │  Redis   │
                                │ (BullMQ) │
                                ├──────────┤
                                │ Worker   │
                                ├──────────┤
                                │Timescale │
                                │   DB     │
                                └──────────┘
```

**Data flow**: Agent → HTTP POST → Redis Queue → Worker → DB + Redis Pub/Sub → WebSocket → Dashboard

## Quick Start

### Option A: Docker (recommended)

```bash
# 1. Clone and install dependencies
git clone <repo-url> && cd server-monitor
pnpm install

# 2. Start everything (PostgreSQL, Redis, backend, frontend)
docker compose up --build

# 3. (Optional) Start a demo agent
pnpm dev:agent
```

Open **http://localhost:5173** — runs in demo mode automatically if no backend is detected.

### Option B: Local development

```bash
# 1. Clone and install dependencies
git clone <repo-url> && cd server-monitor
pnpm install

# 2. Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# 3. Start backend + frontend
pnpm dev

# 4. (Optional) Start a demo agent
pnpm dev:agent
```

Open **http://localhost:5173** — runs in demo mode automatically if no backend is detected.

## Deployment

### Server setup (one-time)

```bash
# On your VPS — installs Docker, Node.js, builds frontend, starts backend
DOMAIN=monitor.example.com ADMIN_PASSWORD=my-secret ./deploy.sh
```

Then configure nginx (see [nginx.md](nginx.md)) and log in at `https://your-domain`.

### Installing agents on servers

After logging in, go to **API Keys** and create a key. Then on each server you want to monitor:

```bash
# Interactive — will prompt for API key, server ID, and interval
curl -sSL https://your-domain/install.sh | bash
```

Or non-interactive:

```bash
API_KEY=your-key-here bash <(curl -sSL https://your-domain/install.sh)
```

This installs a systemd service that starts on boot and restarts on crash.

**Agent commands:**
```bash
systemctl status server-monitor-agent
journalctl -u server-monitor-agent -f
systemctl restart server-monitor-agent
systemctl stop server-monitor-agent
```

### Ports

| Service | Port |
|---|---|
| Frontend | `5173` (dev) / `443` (prod via nginx) |
| Backend | `3300` |
| PostgreSQL | `5434` (dev) / internal only (prod) |
| Redis | `6379` (dev) / internal only (prod) |

## Project Structure

```
server-monitor/
├── apps/
│   ├── agent/          # Server-side metrics collector
│   │   └── src/
│   │       ├── index.ts           # Entry point, CLI args
│   │       ├── collector.ts       # Metric collection + alert generation
│   │       ├── sender.ts          # HTTP POST to backend
│   │       ├── system-collector.ts# OS process collection
│   │       └── pm2-collector.ts   # PM2 process collection
│   │
│   ├── backend/        # NestJS API server
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── auth/             # JWT auth, roles guard, login
│   │       ├── api-keys/         # Per-server API key management
│   │       ├── users/            # User management + registration
│   │       ├── ingest/           # POST /ingest endpoint
│   │       ├── workers/          # BullMQ metrics processor
│   │       ├── websocket/        # Socket.IO real-time gateway
│   │       ├── servers/          # Server registry API
│   │       ├── alerts/           # Alerts CRUD + threshold evaluation
│   │       ├── notifications/    # Email/webhook/Telegram/Discord dispatch
│   │       ├── settings/         # Key-value settings store
│   │       ├── database/         # TypeORM entities + TimescaleDB setup
│   │       ├── redis/            # Redis pub/sub clients
│   │       └── agent-distribution/ # Agent binary serving
│   │
│   └── frontend/       # React + Vite dashboard
│       └── src/
│           ├── App.tsx
│           ├── components/dashboard/  # UI components
│           │   ├── pages/             # Page-level views
│           │   └── *.tsx              # Dashboard widgets
│           ├── hooks/                 # React hooks
│           └── lib/                   # Types, utils, mock data
│
└── packages/
    └── shared/         # Shared TypeScript types
```

## Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Start all packages in parallel           |
| `pnpm dev:frontend` | Frontend only (Vite dev server)          |
| `pnpm dev:backend`  | Backend only (NestJS watch mode)         |
| `pnpm dev:agent`    | Agent only (collects from local machine) |
| `pnpm build`        | Build all packages                       |
| `pnpm typecheck`    | TypeScript check all packages            |
| `pnpm lint`         | Lint all packages                        |

## Configuration

### Agent (`apps/agent/.env`)

| Variable      | Default                 | Description                                            |
| ------------- | ----------------------- | ------------------------------------------------------ |
| `SERVER_ID`   | `srv-prod-01`           | Unique server identifier                               |
| `API_URL`     | `http://localhost:3300` | Backend ingest endpoint                                |
| `API_KEY`     | —                       | API key (per-server key from dashboard, or master key) |
| `INTERVAL_MS` | `2000`                  | Collection interval in ms                              |

### Root `.env` (production)

| Variable                 | Required | Description                                                       |
| ------------------------ | -------- | ----------------------------------------------------------------- |
| `JWT_SECRET`             | Yes      | Secret for signing JWT tokens (min 32 chars in production)        |
| `ADMIN_PASSWORD`         | Yes      | Admin user password (username defaults to `admin`)                |
| `AGENT_API_KEY`          | Yes      | Master API key — works for all agents                             |
| `REDIS_PASSWORD`         | Yes      | Password for Redis authentication                                 |
| `DB_PASSWORD`            | Yes      | Password for PostgreSQL                                           |
| `CORS_ORIGIN`            | No       | Frontend origin for CORS (e.g. `https://monitor.example.com`)     |
| `ALLOW_REGISTRATION`     | No       | `true` to allow open user registration (default: `false`)         |
| `METRICS_RETENTION_DAYS` | No       | Auto-drop snapshots older than N days (default: `7`)              |

### Frontend (`apps/frontend/.env`)

| Variable          | Default | Description                                                   |
| ----------------- | ------- | ------------------------------------------------------------- |
| `VITE_API_URL`    | —       | Backend URL for REST (empty = same-origin `/api/`)            |
| `VITE_SOCKET_URL` | —       | Backend URL for WebSocket (empty = same-origin `/socket.io/`) |

### Notification Channels

Set these in `.env` to enable alert dispatch:

| Variable                       | Channel                                    |
| ------------------------------ | ------------------------------------------ |
| `NOTIFICATION_DISCORD_WEBHOOK` | Discord webhook URL                        |
| `WEBHOOK_URL`                  | HTTP POST URL for generic webhook dispatch |
| `TELEGRAM_BOT_TOKEN`           | Telegram bot token                         |
| `TELEGRAM_CHAT_ID`             | Telegram chat/group ID                     |

## Authentication

### Users

- First admin user is auto-created from `ADMIN_PASSWORD` on first boot
- Open registration is disabled by default (`ALLOW_REGISTRATION=false`)
- Admins can create viewer accounts via `POST /api/users/create`
- JWT tokens expire after 24 hours

### Agent API Keys

Two authentication methods for agents:

1. **Per-server keys** (recommended) — created from the dashboard's API Keys page, optionally scoped to a specific server ID, revocable individually
2. **Master key** — set `AGENT_API_KEY` in `.env`, works for all servers, useful for your own infrastructure

Both can coexist. The ingest endpoint checks the master key first, then per-server keys in the database.

## Alert Thresholds

Alerts are evaluated server-side on every metric ingest, with configurable thresholds:

| Setting key (DB)       | Default        | Description                        |
| ---------------------- | -------------- | ---------------------------------- |
| `criticalThreshold`    | `85`           | CPU & memory critical %            |
| _(derived)_            | threshold - 10 | CPU & memory warning %             |
| `alert.threshold.disk` | `90`           | Disk critical %                    |
| `alert.cooldown`       | `5`            | Minutes before same alert re-fires |

Save via the Settings page in the dashboard, or directly via `PUT /settings`.

## API Endpoints

### Public (no auth)

| Method | Path          | Description                          |
| ------ | ------------- | ------------------------------------ |
| `POST` | `/ingest`     | Receive agent metrics (API key auth) |
| `GET`  | `/health`     | Health check (DB + Redis)            |
| `POST` | `/auth/login` | Login, returns JWT                   |
| `GET`  | `/agent.js`   | Download bundled agent               |
| `GET`  | `/install.sh` | Download agent install script        |

### Authenticated (JWT required)

| Method  | Path                      | Description                 |
| ------- | ------------------------- | --------------------------- |
| `GET`   | `/servers`                | List all registered servers |
| `GET`   | `/servers/:id/metrics`    | Historical metric points    |
| `GET`   | `/servers/:id/processes`  | Latest process snapshot     |
| `GET`   | `/alerts`                 | List alerts (filterable)    |
| `PATCH` | `/alerts/:id/acknowledge` | Acknowledge an alert        |
| `PATCH` | `/alerts/acknowledge-all` | Acknowledge all alerts      |
| `GET`   | `/settings`               | Get all settings            |
| `PUT`   | `/settings`               | Save a setting              |
| `GET`   | `/notifications`          | Notification history        |
| `GET`   | `/users/me`               | Current user profile        |
| `PATCH` | `/users/me`               | Update profile              |

### Admin only

| Method   | Path                   | Description             |
| -------- | ---------------------- | ----------------------- |
| `POST`   | `/users/create`        | Create a viewer account |
| `GET`    | `/api-keys`            | List API keys           |
| `POST`   | `/api-keys`            | Create a new API key    |
| `POST`   | `/api-keys/:id/revoke` | Revoke an API key       |
| `DELETE` | `/api-keys/:id`        | Delete an API key       |

## Tech Stack

| Layer      | Technology                                           |
| ---------- | ---------------------------------------------------- |
| Frontend   | React 18, Vite 5, TypeScript, Tailwind CSS, Recharts |
| UI Library | shadcn/ui (Radix primitives)                         |
| Backend    | NestJS 10, TypeScript, Socket.IO                     |
| Database   | PostgreSQL 16 + TimescaleDB                          |
| Queue      | BullMQ (Redis)                                       |
| Agent      | Node.js, systeminformation, PM2                      |

## License

MIT
