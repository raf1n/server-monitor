import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ServerEntity } from '../database/entities/server.entity';

interface DynamicServer {
  id: string;
  name: string;
  host: string;
  region: string;
  status: 'online' | 'degraded' | 'offline';
  lastSeen: number;
  intervalMs?: number;
  agentVersion?: string;
}

@Injectable()
export class ServersService implements OnModuleDestroy {
  private readonly logger = new Logger(ServersService.name);
  private memory = new Map<string, DynamicServer>();
  private staleInterval: ReturnType<typeof setInterval>;
  private dbOk = true;

  private staticServers = [
    { id: 'srv-prod-01', name: 'prod-web-01', host: '10.0.1.24', region: 'us-east-1' },
    { id: 'srv-prod-02', name: 'prod-api-02', host: '10.0.1.25', region: 'us-east-1' },
    { id: 'srv-stage-01', name: 'stage-worker-01', host: '10.0.2.10', region: 'us-west-2' },
    { id: 'srv-db-01', name: 'db-primary-01', host: '10.0.3.5', region: 'us-east-1' },
    { id: 'srv-edge-01', name: 'edge-cdn-01', host: '10.0.4.2', region: 'eu-west-1' },
  ];

  constructor(
    @InjectRepository(ServerEntity)
    private readonly serverRepo: Repository<ServerEntity>,
  ) {
    for (const s of this.staticServers) {
      this.memory.set(s.id, { ...s, status: 'offline', lastSeen: 0 });
    }
    this.staleInterval = setInterval(() => this.markStale(), 15_000);
  }

  onModuleDestroy() {
    clearInterval(this.staleInterval);
  }

  async register(id: string, host?: string, name?: string, intervalMs?: number, agentVersion?: string) {
    this.memory.set(id, {
      id,
      name: name || id,
      host: host || 'unknown',
      region: 'dynamic',
      status: 'online',
      lastSeen: Date.now(),
      intervalMs,
      agentVersion,
    });

    if (!this.dbOk) return;

    try {
      const existing = await this.serverRepo.findOneBy({ id });
      if (existing) {
        await this.serverRepo.update(id, {
          host: host || existing.host,
          name: name || existing.name,
          status: 'online',
          lastSeen: new Date(),
          intervalMs: intervalMs ?? existing.intervalMs,
          agentVersion: agentVersion ?? existing.agentVersion,
        });
      } else {
        await this.serverRepo.insert({
          id,
          name: name || id,
          host: host || 'unknown',
          region: 'dynamic',
          status: 'online',
          intervalMs,
          agentVersion,
          lastSeen: new Date(),
        });
      }
    } catch {
      this.dbOk = false;
      this.logger.warn('DB unavailable — using in-memory storage');
    }
  }

  async getById(id: string) {
    const all = await this.getAll();
    return all.find((s) => s.id === id) || null;
  }

  async getAll() {
    if (this.dbOk) {
      try {
        const dbServers = await this.serverRepo.find({ order: { name: 'ASC' } });
        if (dbServers.length > 0) return dbServers;
      } catch {
        this.dbOk = false;
      }
    }

    const now = Date.now();
    const merged = new Map<string, { id: string; name: string; host: string; region: string; status: 'online' | 'offline' | 'degraded'; agentIntervalMs?: number; agentVersion?: string }>();
    for (const s of this.staticServers) {
      const dyn = this.memory.get(s.id);
      merged.set(s.id, {
        ...s,
        status: dyn ? (now - dyn.lastSeen > 30_000 ? 'offline' : dyn.status) : 'offline' as const,
        agentIntervalMs: dyn?.intervalMs,
        agentVersion: dyn?.agentVersion,
      });
    }
    for (const s of this.memory.values()) {
      if (!merged.has(s.id)) {
        merged.set(s.id, {
          id: s.id, name: s.name, host: s.host, region: s.region,
          status: (now - s.lastSeen > 30_000 ? 'offline' : s.status) as 'online' | 'offline' | 'degraded',
          agentIntervalMs: s.intervalMs,
          agentVersion: s.agentVersion,
        });
      }
    }
    return Array.from(merged.values());
  }

  private markStale() {
    if (this.dbOk) {
      try {
        const threshold = new Date(Date.now() - 30_000);
        this.serverRepo.update(
          { lastSeen: LessThan(threshold), status: 'online' },
          { status: 'offline' },
        );
        return;
      } catch {}
    }

    const threshold = Date.now() - 30_000;
    for (const [, server] of this.memory) {
      if (server.lastSeen < threshold) {
        server.status = 'offline';
      }
    }
  }
}
