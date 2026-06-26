# System Name

Real-Time VPS Monitoring & Observability Platform

# Objective

Build a scalable, production-grade monitoring system that collects real-time server metrics and visualizes them in a high-performance dashboard built with React (Vite), supporting multiple servers, alerts, and historical analysis.

---

# Tech Stack

## Frontend

- React (Vite)
- Tailwind CSS
- Recharts (charts)
- Socket.IO client (real-time)

## Backend

- NestJS (API + workers)
- Redis (queue + pub/sub)
- PostgreSQL + TimescaleDB (time-series storage)
- WebSocket server (Socket.IO)

## Agent

- Node.js
- systeminformation
- PM2 integration

---

# Core System Components

## 1. Agent (VPS Side)

- Runs on each server
- Collects:
  - CPU usage (%)
  - Memory usage (%)
  - Disk usage per mount
  - PM2 process metrics
- Sends data every 2–5 seconds
- Uses API key authentication
- Retry mechanism on failure

---

## 2. Ingestion API (NestJS)

- Endpoint: POST /ingest
- Responsibilities:
  - Validate incoming data
  - Authenticate API key
  - Rate limit
  - Push to Redis queue
- Must NOT:
  - Perform heavy processing
  - Write directly to database

---

## 3. Queue Layer

- Redis (BullMQ)
- Handles:
  - Traffic bursts
  - Async processing
  - Job retries

---

## 4. Worker Service

- Consumes queue jobs
- Responsibilities:
  - Store metrics in database
  - Publish real-time updates via Redis Pub/Sub
  - Trigger alert rules

---

## 5. Database (TimescaleDB)

- PostgreSQL with time-series extension
- Stores:
  - Raw metrics (high frequency)
  - Aggregated metrics (hourly/daily)
- Supports:
  - Hypertables
  - Retention policies
  - Efficient queries by time + server

---

## 6. Realtime Layer

- WebSocket server using Socket.IO
- Subscribes to Redis Pub/Sub
- Broadcasts "stats" events to clients

---

## 7. Frontend (React + Vite)

### Architecture

- SPA (Single Page Application)
- Connects to WebSocket server
- Fetches historical data via REST API

---

## UI Requirements

### Layout

- Sidebar navigation
- Topbar (server selector, time range)
- Main dashboard

---

### Dashboard Features

#### Overview Cards

- CPU usage
- Memory usage
- Disk usage
- Active processes

#### Charts

- CPU usage over time (line)
- Memory usage over time (line)
- Disk usage per mount (bar)
- Network traffic (optional)

#### Process Monitoring

- Table showing:
  - Name
  - Status (online/stopped)
  - CPU %
  - Memory
  - Uptime

#### Alerts Panel

- List of triggered alerts
- Severity levels
- Timestamp

---

## Realtime Behavior

- Connect via Socket.IO
- Listen to "stats" event
- Update UI without full re-render
- Maintain state per serverId

---

## State Management

- React hooks (useState, useEffect)
- Optional: Zustand for global state
- Store:
  - servers
  - metrics
  - alerts

---

## 8. Alerts System

- Rule-based:
  - CPU > threshold
  - Memory > threshold
  - Disk > threshold
  - Process down
- Notification:
  - Email
  - Webhook
  - Telegram (optional)

---

## 9. Multi-Server Support

- Each server identified by serverId
- Ability to:
  - Filter servers
  - Tag servers (prod/dev)
  - Group servers

---

## 10. Security

- API key per agent
- HTTPS only
- Rate limiting
- Optional:
  - HMAC signature validation

---

# Data Model

{
serverId: string,
timestamp: number,
cpu: number,
memory: number,
disk: [{ mount: string, used: number }],
processes: [
{
name: string,
status: string,
cpu: number,
memory: number
}
]
}

---

# Non-Functional Requirements

## Performance

- Real-time updates under 1 second latency
- Handle thousands of metrics/sec

## Scalability

- Horizontally scalable API, workers, and WS server

## Reliability

- Retry logic in agent
- Queue-based processing
- No data loss under spikes

---

# Deployment

- Docker containers:
  - API
  - Worker
  - WebSocket server
  - Redis
  - PostgreSQL
  - Frontend (served via Nginx)

---

# Development Phases

## Phase 1 (MVP)

- Agent + ingestion API + WebSocket
- Basic React dashboard (real-time only)

## Phase 2

- Add database storage
- Historical charts

## Phase 3

- Alerts system
- Multi-server UI

## Phase 4

- Scaling + optimization
- Aggregation + retention

---

# Deliverables Expected from AI

- Full NestJS backend (modular)
- Redis queue integration
- WebSocket server
- TimescaleDB schema
- React (Vite) dashboard with components
- Docker Compose setup

---

# Constraints

- Do not use Next.js
- Do not tightly couple frontend and backend
- Do not write metrics directly to DB in controllers
- Ensure modular, scalable architecture

---

# Goal

A clean, scalable, real-time monitoring platform similar in architecture to Datadog, but lightweight and self-hosted, built using React (Vite) for frontend and NestJS for backend.
