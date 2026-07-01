import "dotenv/config";
import { Collector } from "./collector";
import { Sender } from "./sender";

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    serverId: process.env.SERVER_ID || "srv-prod-01",
    apiUrl: process.env.API_URL || "http://localhost:3300",
    apiKey: process.env.API_KEY || "",
    interval: Number(process.env.INTERVAL_MS) || 60000,
    maxRetries: Number(process.env.MAX_RETRIES) || 3,
    retryBackoff: Number(process.env.RETRY_BACKOFF) || 1000,
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
      const val = Number(next);
      if (isNaN(val) || val <= 0 || !isFinite(val)) {
        console.error("Error: --interval must be a positive number");
        process.exit(1);
      }
      config.interval = val;
      i++;
    } else if (arg === "--max-retries") {
      const val = Number(next);
      if (isNaN(val) || val < 0 || !isFinite(val)) {
        console.error("Error: --max-retries must be a non-negative number");
        process.exit(1);
      }
      config.maxRetries = val;
      i++;
    } else if (arg === "--retry-backoff") {
      const val = Number(next);
      if (isNaN(val) || val <= 0 || !isFinite(val)) {
        console.error("Error: --retry-backoff must be a positive number");
        process.exit(1);
      }
      config.retryBackoff = val;
      i++;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Server Monitor Agent

Usage:
  node agent.js [options]

Options:
  --id, --server-id <id>         Unique server identifier (default: srv-prod-01)
  --url, --api-url <url>         Backend API URL (default: http://localhost:3300)
  --key, --api-key <key>         API key for authentication
  --interval <ms>                Metrics collection interval (default: 60000)
  --max-retries <n>              Send retry attempts before buffering (default: 3)
  --retry-backoff <ms>           Base retry backoff in ms (default: 1000)
  -h, --help                     Show this help

Environment variables (fallback):
  SERVER_ID, API_URL, API_KEY, INTERVAL_MS, MAX_RETRIES, RETRY_BACKOFF
`);
      process.exit(0);
    }
  }
  return config;
}

const { serverId, apiUrl, apiKey, interval, maxRetries, retryBackoff } =
  parseArgs();

if (!apiKey) {
  console.error("Error: API key is required. Set API_KEY env var.");
  process.exit(1);
}

const isLocalhost =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/.test(apiUrl);
if (!isLocalhost && !apiUrl.startsWith("https://")) {
  console.error(
    "Error: API_URL must use HTTPS for non-localhost connections. Use https:// or http://localhost.",
  );
  process.exit(1);
}

const collector = new Collector(interval);
const sender = new Sender(apiUrl, apiKey, maxRetries, retryBackoff);

async function tick() {
  try {
    await sender.flushBuffer();

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
