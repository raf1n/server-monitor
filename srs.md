# System Name

Real-Time VPS Monitoring & Observability Platform

# Objective

Build a scalable, production-grade monitoring system that collects real-time server metrics from multiple VPS servers via lightweight agents, processes them through a queue-based backend, and visualizes everything in a self-hosted React dashboard with real-time WebSocket updates, alerting, and multi-channel notifications.

---

# Tech Stack

## Frontend

- React 18 (Vite 5)
- Tailwind CSS
- shadcn/ui (Radix primitives)
- Recharts (charts)
- Socket.IO client (real-time)

## Backend

- NestJS 10 (API + workers)
- Redis 7 (BullMQ queue + pub/sub)
- PostgreSQL 16 + TimescaleDB (time-series storage)
- WebSocket server (Socket.IO)
- Passport.js (JWT auth)
- bcrypt (password hashing)

## Agent

- Node.js 18+
- systeminformation
- PM2 integration

---

# Core System Components

## 1. Agent (VPS Side)

- Runs on each monitored server
- Collects:
  - CPU usage (%)
  - Memory usage (%)
  - Disk usage per mount
  - Network I/O
  - Load average, uptime
  - System processes (top 10 by CPU/memory)
  - PM2 process metrics
- Sends data every 2–5 seconds via HTTP POST
- Authenticates with per-server API key (or master key)
- Generates agent-side threshold alerts
- Retry mechanism on failure
- Installable as systemd service via install script

---

## 2. Ingestion API (NestJS)

- Endpoint: `POST /ingest` (public, no `/api/` prefix)
- Responsibilities:
  - Authenticate agent via `x-api-key` header
  - Validate incoming data
  - Rate limit (100 req/60s per IP)
  - Push to Redis BullMQ queue
- Authentication order:
  1. Check master key (`AGENT_API_KEY` env var)
  2. Check per-server keys in `api_keys` table (bcrypt-hashed, prefix lookup)
  3. Reject if no match
- If key is scoped to a server, reject data from other servers
- Must NOT:
  - Perform heavy processing
  - Write directly to database

---

## 3. Queue Layer

- Redis (BullMQ)
- Queue name: `metrics-ingest`
- Handles:
  - Traffic bursts
  - Async processing
  - Job retries (3 attempts, exponential backoff)
  - Auto-cleanup (remove completed jobs after 1 hour)

---

## 4. Worker Service

- Consumes BullMQ queue jobs
- Responsibilities:
  - Auto-register/update server in registry
  - Store metric snapshot in TimescaleDB
  - Evaluate backend-side alert thresholds
  - Publish real-time updates via Redis Pub/Sub channel `stats:{serverId}`

---

## 5. Database (TimescaleDB)

- PostgreSQL 16 with TimescaleDB extension
- Entities:
  - `servers` — server registry (id, name, host, region, status, lastSeen)
  - `metric_snapshots` — time-series metrics (hypertable with compression + retention)
  - `alerts` — triggered alerts (serverId, title, severity, acknowledged)
  - `notifications` — notification dispatch log
  - `settings` — key-value configuration store (per-server optional)
  - `users` — user accounts (username, bcrypt password, role)
  - `api_keys` — per-server agent API keys (bcrypt-hashed, revocable)
- Supports:
  - Hypertables with automatic compression (1 day)
  - Configurable retention policies (default 7 days)
  - Auto-migrations on startup for schema changes

---

## 6. Realtime Layer

- WebSocket server using Socket.IO
- JWT-authenticated connections
- Subscribes to Redis Pub/Sub pattern `stats:*`
- Broadcasts `stats` events to per-server rooms
- Pushes `alert` events in real-time
- Clients emit `subscribe`/`unsubscribe` to join/leave server rooms

---

## 7. Frontend (React + Vite)

### Architecture

- SPA (Single Page Application)
- Two modes:
  - **Live mode**: connects to backend via REST + Socket.IO (JWT auth required)
  - **Demo mode**: generates simulated data client-side (no backend needed)
- Lazy-loaded pages for code splitting

### Pages

- **Dashboard** — overview with stat cards, time-series charts, process table, alert list
- **Servers** — server grid with status indicators
- **Processes** — sortable process table with CPU/Memory/PM2 views
- **Alerts** — full alert list with severity filters, acknowledge/delete
- **API Keys** — create, list, revoke per-server agent keys (admin only)
- **Settings** — monitoring, display, notification preferences
- **Profile** — update username, email, change password
- **Login** — JWT authentication

### UI Components

- Sidebar navigation (collapsible, mobile responsive)
- Topbar (server selector, connection status, time range, notifications, user menu with role badge)
- Stat cards with sparkline charts and delta indicators
- Time-series area charts (CPU, memory, disk)
- Network I/O dual-line chart
- Disk usage bar chart
- Sortable process table with search and filters
- Alert severity badges and relative timestamps

---

## 8. Authentication & Authorization

### User Authentication

- JWT-based (24h expiry)
- Login via `POST /auth/login`
- Global JWT guard with `@Public()` decorator for exempt routes
- Passwords bcrypt-hashed (cost 10)
- Token carries: `sub` (userId), `username`, `email`, `role`

### Roles

- **admin** — full access, can create users and manage API keys
- **viewer** — read-only dashboard access
- First admin auto-created from `ADMIN_PASSWORD` env var on first boot
- Existing users auto-promoted to admin if no admin exists (migration)
- Open registration disabled by default (`ALLOW_REGISTRATION=false`)

### Agent Authentication

- Per-server API keys (recommended):
  - Created from dashboard, bcrypt-hashed, identified by 8-char prefix
  - Optional server ID scoping
  - Revocable individually
  - Tracks `lastUsedAt` timestamp
- Master key (optional):
  - `AGENT_API_KEY` env var
  - Works for all servers, no per-server revocation

---

## 9. Alerts System

### Dual-Phase Evaluation

1. **Agent-side**: threshold alerts on CPU >85/70, memory >90/80, disk >90, PM2 errored processes. Deduplicates via active alert set.
2. **Backend-side**: evaluates configurable thresholds on every ingest. Cooldown per server+alert key (default 5 min). Stale alert cleanup every 60s.

### Configurable Thresholds (via Settings)

| Key | Default | Description |
|---|---|---|
| `criticalThreshold` | `85` | CPU & memory critical % |
| `alert.threshold.disk` | `90` | Disk critical % |
| `alert.cooldown` | `5` | Minutes before same alert re-fires |

### Notification Channels

- Discord (embed with color-coded severity)
- Telegram (Markdown message)
- Webhook (HTTP POST with JSON payload)
- Email (logged, not sent)

### Alert Management

- List with filters (server, severity, acknowledged)
- Acknowledge individually or all
- Delete old alerts
- Real-time push via WebSocket

---

## 10. Settings System

- Key-value store in `settings` table
- Optional per-server scoping
- 60-second in-memory cache with TTL eviction
- Bulk update endpoint
- Accessible via dashboard Settings page and REST API

---

## 11. Multi-Server Support

- Each server identified by `serverId` (string)
- Auto-registered on first agent data push
- Status tracking: online/offline/degraded (30s stale timeout)
- Server selector in topbar
- Per-server metrics, processes, alerts, and settings
- Server grid page with status indicators

---

## 12. Agent Distribution

- Backend serves agent artifacts at runtime:
  - `GET /agent.js` — bundled single-file agent (CJS, Node 18+)
  - `GET /install.sh` — systemd install script
  - `GET /agent-info` — agent README
- Agent bundled via esbuild with shebang for direct execution
- One-command install: `bash <(curl -fsSL https://domain/install.sh) --server-id ... --api-url ... --api-key ...`

---

## 13. Health Check

- `GET /health` (public)
- Checks database connectivity and Redis ping
- Returns `{ status: "ok" | "degraded", checks: { database, redis } }`
- Used by Docker healthcheck and monitoring

---

# Security

| Layer | Mechanism |
|---|---|
| Agent → Backend | Per-server API keys (bcrypt-hashed) or master key |
| Frontend → Backend REST | JWT Bearer token (24h expiry) |
| Frontend → WebSocket | JWT via `auth.token` on handshake |
| Passwords | bcrypt (cost 10) |
| HTTP headers | helmet() middleware |
| CORS | Locked to `CORS_ORIGIN` env var |
| Rate limiting | 100 requests / 60 seconds per IP |
| Input validation | ValidationPipe with whitelist (strips unknown properties) |
| Production secrets | Startup fails if JWT_SECRET is missing, too short, or dev default |
| User registration | Disabled by default (`ALLOW_REGISTRATION=false`) |

---

# Deployment

## Architecture

```
Nginx (host, port 443, SSL)
  ├── /           → serves dist/index.html (React SPA)
  ├── /assets/*   → static files (1y cache, immutable)
  ├── /api/*      → proxy_pass backend:3000
  ├── /socket.io/ → proxy_pass backend:3000 (WebSocket upgrade)
  └── /ingest, /health, /agent.js, /install.sh → proxy_pass backend:3000

Docker containers (internal network):
  ├── Backend (NestJS, port 3000)
  ├── PostgreSQL + TimescaleDB
  └── Redis
```

- Frontend built as static SPA, served directly by nginx
- Backend, database, and Redis run in Docker
- `deploy.sh` automates full VPS setup
- Nginx configs provided in `nginx.md` (with and without SSL)

---

# Data Model

## Metric Snapshot

```json
{
  "serverId": "srv-prod-01",
  "timestamp": 1719500000000,
  "cpu": 45.2,
  "memory": 67.8,
  "disk": 55.1,
  "network": { "rx": 1234567, "tx": 7654321 },
  "loadAvg": [1.2, 0.8, 0.5],
  "uptime": 86400,
  "mounts": [{ "mount": "/", "used": 55.1, "size": 100000000000 }],
  "processes": [
    { "name": "node", "pid": 1234, "cpu": 12.5, "mem": 256, "status": "online" }
  ],
  "history": { "cpu": [42, 44, 45], "memory": [65, 66, 67] },
  "alerts": [
    { "id": "abc", "title": "High CPU", "severity": "warning", "source": "agent" }
  ]
}
```

---

# Non-Functional Requirements

## Performance

- Real-time updates under 1 second latency
- Handle thousands of metrics/sec via queue-based processing
- TimescaleDB compression reduces storage for old data

## Scalability

- Horizontally scalable API and workers
- Redis pub/sub decouples WebSocket from processing
- TimescaleDB handles time-series at scale

## Reliability

- Retry logic in agent and BullMQ (exponential backoff)
- Queue-based processing prevents data loss under spikes
- Configurable retention policies auto-cleanup old data

## Security

- Per-server API key isolation
- Role-based access control
- Production secret validation at startup
- Registration disabled by default

---

# Development Phases

## Phase 1 (MVP) ✓

- Agent + ingestion API + WebSocket
- Basic React dashboard (real-time only)

## Phase 2 ✓

- TimescaleDB storage + hypertables
- Historical charts with time range selection

## Phase 3 ✓

- Dual-phase alert system (agent + backend)
- Multi-channel notifications (Discord, Telegram, webhook)

## Phase 4 ✓

- JWT authentication with admin/viewer roles
- Per-server API keys (create, revoke, scope)
- User management (registration, profile, password change)

## Phase 5 ✓

- Production deployment tooling (deploy.sh, nginx configs)
- Health checks, retention policies, compression
- Agent distribution (bundled agent, install script)

---

# Constraints

- Do not use Next.js
- Do not tightly couple frontend and backend
- Do not write metrics directly to DB in controllers
- Ensure modular, scalable architecture

---

# Goal

A clean, scalable, real-time monitoring platform similar in architecture to Datadog, but lightweight and self-hosted, built using React (Vite) for frontend and NestJS for backend. Supports multi-server monitoring with per-server agent keys, role-based access, configurable alerting, and one-command VPS deployment.
