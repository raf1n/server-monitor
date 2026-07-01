import type { ServerStats } from "@server-monitor/shared";

const MAX_BUFFER_SIZE = 60;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class Sender {
  private readonly url: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly retryBackoff: number;
  private readonly buffer: ServerStats[] = [];

  constructor(
    url: string,
    apiKey: string,
    maxRetries = 3,
    retryBackoff = 1000,
  ) {
    this.url = `${url.replace(/\/$/, "")}/ingest`;
    this.apiKey = apiKey;
    this.maxRetries = maxRetries;
    this.retryBackoff = retryBackoff;
  }

  async send(data: ServerStats): Promise<void> {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.sendOnce(data);
        return;
      } catch (err) {
        const isLast = attempt === this.maxRetries - 1;
        if (isLast) {
          this.bufferData(data);
          throw err;
        }
        const delay =
          this.retryBackoff * Math.pow(2, attempt) + Math.random() * 500;
        await sleep(delay);
      }
    }
  }

  async flushBuffer(): Promise<void> {
    while (this.buffer.length > 0) {
      const data = this.buffer[0];
      try {
        await this.sendOnce(data);
        this.buffer.shift();
      } catch {
        break;
      }
    }
  }

  private bufferData(data: ServerStats): void {
    this.buffer.push(data);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
  }

  private async sendOnce(data: ServerStats): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Ingest failed: ${res.status} ${res.statusText}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
