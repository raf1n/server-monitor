import "dotenv/config";
import { Collector } from "./collector";
import { Sender } from "./sender";

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    serverId: process.env.SERVER_ID || "srv-prod-01",
    apiUrl: process.env.API_URL || "http://localhost:3000",
    apiKey: process.env.API_KEY || "",
    interval: Number(process.env.INTERVAL_MS) || 2000,
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === "--server-id" || arg === "--id") {
      config.serverId = next;
      i++;
    } else if (arg === "--api-url" || arg === "--url") {
      config.apiUrl = next;
      i++;
    } else if (arg === "--api-key" || arg === "--key") {
      config.apiKey = next;
      i++;
    } else if (arg === "--interval") {
      config.interval = Number(next);
      i++;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Server Monitor Agent

Usage:
  node agent.js [options]

Options:
  --id, --server-id <id>       Unique server identifier (default: srv-prod-01)
  --url, --api-url <url>       Backend API URL (default: http://localhost:3000)
  --key, --api-key <key>       API key for authentication
  --interval <ms>              Metrics collection interval (default: 2000)
  -h, --help                   Show this help

Environment variables (fallback):
  SERVER_ID, API_URL, API_KEY, INTERVAL_MS
`);
      process.exit(0);
    }
  }
  return config;
}

const { serverId, apiUrl, apiKey, interval } = parseArgs();

if (!apiKey) {
  console.error('Error: API key is required. Set --key flag or API_KEY env var.');
  process.exit(1);
}

const collector = new Collector();
const sender = new Sender(apiUrl, apiKey);

async function tick() {
  try {
    const stats = await collector.collect(serverId);
    await sender.send(stats);
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] tick failed:`,
      (err as Error).message,
    );
  }
}

console.log(
  `[${new Date().toISOString()}] Agent started — server: ${serverId}, backend: ${apiUrl}, interval: ${interval}ms`,
);
tick();
setInterval(tick, interval);

process.on("SIGINT", () => {
  console.log("Agent shutting down");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("Agent shutting down (SIGTERM)");
  process.exit(0);
});
