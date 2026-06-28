# Server Monitor Agent

Lightweight system monitoring agent for Linux/macOS. Collects CPU, memory, disk, network, and process metrics and sends them to a central Server Monitor backend every N seconds.

## Quick Install

```bash
curl -fsSL https://your-server.com/install.sh | bash -s -- \
  --server-id srv-my-vps-01 \
  --api-url https://your-server.com \
  --api-key your-agent-api-key
```

Or download and run manually:

```bash
curl -O https://your-server.com/agent.js
chmod +x agent.js
SERVER_ID=srv-my-vps-01 API_URL=https://your-server.com API_KEY=your-key node agent.js
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `SERVER_ID` | auto (from hostname) | Unique identifier for this server |
| `API_URL` | — | Backend URL (e.g. https://monitor.example.com) |
| `API_KEY` | — | Must match backend `AGENT_API_KEY` |
| `INTERVAL_MS` | 5000 | Collection interval in milliseconds |

All config can be set via environment variables or CLI flags:
`--server-id`, `--api-url`, `--api-key`, `--interval`

## Requirements

- Node.js 18+
- Linux (systemd) or macOS
- `ps` command (standard on all systems)
- PM2 (optional — for PM2 process monitoring)

## Service Management (Linux)

```bash
sudo systemctl status server-monitor-agent
sudo journalctl -u server-monitor-agent -f
sudo systemctl restart server-monitor-agent
```
