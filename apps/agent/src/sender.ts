import type { ServerStats } from "@server-monitor/shared";

export class Sender {
  private url: string;
  private apiKey: string;

  constructor(url: string, apiKey: string) {
    this.url = `${url.replace(/\/$/, "")}/ingest`;
    this.apiKey = apiKey;
  }

  async send(data: ServerStats): Promise<void> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error(`Ingest failed: ${res.status} ${res.statusText}`);
    }
  }
}
