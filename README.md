# Server Monitor

Real-time server monitoring and observability platform — lightweight, self-hosted, inspired by Datadog.

Collects CPU, memory, disk, network, and process metrics from multiple servers via a lightweight agent, streams them through a NestJS backend with Redis queueing and TimescaleDB storage, and visualizes everything in a real-time React dashboard.

## Architecture

```
┌──────────┐   POST /ingest    ┌──────────┐   subscribe   ┌──────────┐
│  Agent   │ ──────────────────→│ Backend  │ ←──────────── │ Frontend │
│ (per VPS)│   (API key auth)   │ (NestJS) │  (Socket.IO)  │ (React)  │
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

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# 3. Start backend + frontend
pnpm dev

# 4. (Optional) Start a demo agent
pnpm dev:agent
```

Open **http://localhost:5173** — runs in demo mode automatically if no backend is detected.

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
│   │       ├── ingest/           # POST /ingest endpoint
│   │       ├── workers/          # BullMQ metrics processor
│   │       ├── websocket/        # Socket.IO real-time gateway
│   │       ├── servers/          # Server registry API
│   │       ├── alerts/           # Alerts CRUD + threshold evaluation
│   │       ├── notifications/    # Email/webhook/Telegram dispatch
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
│           │   └── *.tsx             # Dashboard widgets
│           ├── hooks/                # React hooks
│           └── lib/                  # Types, utils, mock data
│
└── packages/
    └── shared/         # Shared TypeScript types
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all packages in parallel |
| `pnpm dev:frontend` | Frontend only (Vite dev server) |
| `pnpm dev:backend` | Backend only (NestJS watch mode) |
| `pnpm dev:agent` | Agent only (collects from local machine) |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | TypeScript check all packages |
| `pnpm lint` | Lint all packages |

## Configuration

### Agent (`apps/agent/.env`)

| Variable | Default | Description |
|---|---|---|
| `SERVER_ID` | `srv-prod-01` | Unique server identifier |
| `API_URL` | `http://localhost:3000` | Backend ingest endpoint |
| `API_KEY` | `dev-agent-key-123` | API key for authentication |
| `INTERVAL_MS` | `2000` | Collection interval in ms |

### Backend (`apps/backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5434` | PostgreSQL port |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_NAME` | `server_monitor` | Database name |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `AGENT_API_KEY` | — | API key for agent auth |
| `METRICS_RETENTION_DAYS` | `7` | Auto-drop snapshots older than N days |

### Frontend (`apps/frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_SOCKET_URL` | — | Backend URL for WebSocket + REST (empty = demo mode) |

### Notification Channels

Set these in `apps/backend/.env` to enable alert dispatch:

| Variable | Channel |
|---|---|
| `NOTIFICATION_EMAIL` | Email address for alert notifications (logged only) |
| `WEBHOOK_URL` | HTTP POST URL for webhook dispatch |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Telegram chat/group ID |

## Alert Thresholds

Alerts are evaluated server-side on every metric ingest, with configurable thresholds:

| Setting key (DB) | Default | Description |
|---|---|---|
| `criticalThreshold` | `85` | CPU & memory critical % |
| _(derived)_ | threshold - 10 | CPU & memory warning % |
| `alert.threshold.disk` | `90` | Disk critical % |
| `alert.cooldown` | `5` | Minutes before same alert re-fires |

Save via the Settings page in the dashboard, or directly via `PUT /settings`.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/ingest` | Receive agent metrics (API key auth) |
| `GET` | `/servers` | List all registered servers |
| `GET` | `/servers/:id/metrics` | Historical metric points |
| `GET` | `/servers/:id/processes` | Latest process snapshot |
| `GET` | `/alerts` | List alerts (filterable) |
| `PATCH` | `/alerts/:id/acknowledge` | Acknowledge an alert |
| `PATCH` | `/alerts/acknowledge-all` | Acknowledge all alerts |
| `GET` | `/settings` | Get all settings |
| `PUT` | `/settings` | Save a setting |
| `GET` | `/notifications` | Notification history |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript, Tailwind CSS, Recharts |
| UI Library | shadcn/ui (Radix primitives) |
| Backend | NestJS 10, TypeScript, Socket.IO |
| Database | PostgreSQL 16 + TimescaleDB |
| Queue | BullMQ (Redis) |
| Agent | Node.js, systeminformation, PM2 |

## License

MIT
