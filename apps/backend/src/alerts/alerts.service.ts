import { Injectable, Logger, Optional, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { AlertEntity } from '../database/entities/alert.entity';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StatsGateway } from '../websocket/stats.gateway';

export interface Thresholds {
  cpuCritical: number;
  cpuWarn: number;
  memCritical: number;
  memWarn: number;
  diskCritical: number;
}

const DEFAULT_THRESHOLDS: Thresholds = {
  cpuCritical: 85,
  cpuWarn: 70,
  memCritical: 90,
  memWarn: 80,
  diskCritical: 90,
};

@Injectable()
export class AlertsService implements OnModuleDestroy {
  private readonly logger = new Logger(AlertsService.name);
  // Track last-fired timestamp per server+alertKey for cooldown
  private lastFired = new Map<string, number>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
    @Optional() private readonly settingsService?: SettingsService,
    @Optional() private readonly notificationsService?: NotificationsService,
    @Optional() private readonly statsGateway?: StatsGateway,
  ) {
    this.cleanupTimer = setInterval(() => this.evictStale(), 60_000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  async findAll(params: {
    serverId?: string;
    severity?: string;
    acknowledged?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<AlertEntity[]> {
    const where: FindOptionsWhere<AlertEntity> = {};
    if (params.serverId) where.serverId = params.serverId;
    if (params.severity) where.severity = params.severity;
    if (params.acknowledged !== undefined) where.acknowledged = params.acknowledged;

    return await this.alertRepo.find({
      where,
      order: { timestamp: 'DESC' },
      take: Math.min(params.limit || 100, 500),
      skip: params.offset || 0,
    });
  }

  async count(params: {
    serverId?: string;
    acknowledged?: boolean;
    severity?: string;
  }): Promise<number> {
    const where: FindOptionsWhere<AlertEntity> = {};
    if (params.serverId) where.serverId = params.serverId;
    if (params.acknowledged !== undefined) where.acknowledged = params.acknowledged;
    if (params.severity) where.severity = params.severity;
    return await this.alertRepo.count({ where });
  }

  async findOne(id: string): Promise<AlertEntity | null> {
    return await this.alertRepo.findOneBy({ id });
  }

  async findBySourceId(sourceId: string): Promise<AlertEntity | null> {
    return await this.alertRepo.findOneBy({ sourceId });
  }

  async create(data: Partial<AlertEntity>): Promise<AlertEntity> {
    const alert = this.alertRepo.create({
      ...data,
      timestamp: data.timestamp || new Date(),
    });
    return await this.alertRepo.save(alert);
  }

  async acknowledge(id: string): Promise<AlertEntity | null> {
    await this.alertRepo.update(id, { acknowledged: true });
    return await this.findOne(id);
  }

  async acknowledgeAll(serverId?: string): Promise<number> {
    const where: FindOptionsWhere<AlertEntity> = { acknowledged: false };
    if (serverId) where.serverId = serverId;
    const result = await this.alertRepo.update(where, { acknowledged: true });
    return result.affected || 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.alertRepo.delete(id);
    return (result.affected || 0) > 0;
  }

  async deleteOld(before: Date): Promise<number> {
    const result = await this.alertRepo.delete({ timestamp: before });
    return result.affected || 0;
  }

  async loadThresholds(serverId?: string): Promise<Thresholds> {
    if (!this.settingsService) return { ...DEFAULT_THRESHOLDS };
    const t = { ...DEFAULT_THRESHOLDS };

    const read = async (key: string): Promise<number | null> => {
      const raw = await this.settingsService!.getWithFallback(key, serverId);
      if (raw) {
        const n = Number(raw);
        if (n > 0 && n <= 100) return n;
      }
      return null;
    };

    const cpuCrit = await read('threshold.cpu.critical');
    const cpuW = await read('threshold.cpu.warn');
    const memCrit = await read('threshold.mem.critical');
    const memW = await read('threshold.mem.warn');
    const diskCrit = await read('threshold.disk.critical');

    if (cpuCrit !== null) t.cpuCritical = cpuCrit;
    if (cpuW !== null) t.cpuWarn = cpuW;
    if (memCrit !== null) t.memCritical = memCrit;
    if (memW !== null) t.memWarn = memW;
    if (diskCrit !== null) t.diskCritical = diskCrit;

    // Legacy single criticalThreshold fallback for cpu/mem critical
    if (cpuCrit === null || memCrit === null) {
      const legacy = await this.settingsService.get('criticalThreshold');
      if (legacy) {
        const n = Number(legacy);
        if (n > 0 && n <= 100) {
          if (cpuCrit === null) t.cpuCritical = n;
          if (memCrit === null) t.memCritical = n;
          if (cpuW === null) t.cpuWarn = Math.max(n - 10, 30);
          if (memW === null) t.memWarn = Math.max(n - 10, 30);
        }
      }
    }

    // Legacy alert.threshold.disk fallback
    if (diskCrit === null) {
      const diskRaw = await this.settingsService.get('alert.threshold.disk');
      if (diskRaw) {
        const n = Number(diskRaw);
        if (n > 0 && n <= 100) t.diskCritical = n;
      }
    }

    return t;
  }

  async loadCooldownMinutes(): Promise<number> {
    if (!this.settingsService) return 5;
    const raw = await this.settingsService.get('alert.cooldown');
    if (raw) {
      const n = Number(raw);
      if (n > 0) return n;
    }
    return 5;
  }

  async evaluateAndCreate(
    serverId: string,
    cpu: number,
    memory: number,
    disk: number,
  ): Promise<void> {
    const thresholds = await this.loadThresholds(serverId);
    const cooldownMs = (await this.loadCooldownMinutes()) * 60_000;
    const now = Date.now();

    const checks: Array<{
      key: string;
      title: string;
      message: string;
      severity: string;
      fired: boolean;
    }> = [];

    // CPU
    if (cpu > thresholds.cpuCritical) {
      checks.push({
        key: `cpu-critical:${serverId}`,
        title: 'High CPU Usage',
        message: `CPU at ${cpu}% on ${serverId}`,
        severity: 'critical',
        fired: false,
      });
    } else if (cpu > thresholds.cpuWarn) {
      checks.push({
        key: `cpu-warn:${serverId}`,
        title: 'High CPU Usage',
        message: `CPU at ${cpu}% on ${serverId}`,
        severity: 'warning',
        fired: false,
      });
    }

    // Memory
    if (memory > thresholds.memCritical) {
      checks.push({
        key: `mem-critical:${serverId}`,
        title: 'Memory Pressure',
        message: `Memory at ${memory}% on ${serverId}`,
        severity: 'critical',
        fired: false,
      });
    } else if (memory > thresholds.memWarn) {
      checks.push({
        key: `mem-warn:${serverId}`,
        title: 'Memory Pressure',
        message: `Memory at ${memory}% on ${serverId}`,
        severity: 'warning',
        fired: false,
      });
    }

    // Disk
    if (disk > thresholds.diskCritical) {
      checks.push({
        key: `disk-critical:${serverId}`,
        title: 'Disk Almost Full',
        message: `Disk at ${disk}% on ${serverId}`,
        severity: 'critical',
        fired: false,
      });
    }

    for (const check of checks) {
      const last = this.lastFired.get(check.key) || 0;
      if (now - last < cooldownMs) continue;

      this.lastFired.set(check.key, now);

      try {
        const alert = await this.create({
          serverId,
          title: check.title,
          message: check.message,
          severity: check.severity,
          source: 'threshold.monitor',
          timestamp: new Date(now),
          acknowledged: false,
        });

        this.notificationsService?.dispatchFromAlert({
          id: alert.id,
          serverId,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
        });

        this.statsGateway?.emitAlert(serverId, alert);
      } catch (err) {
        this.logger.warn(`Failed to create alert for ${serverId}: ${(err as Error).message}`);
      }
    }
  }

  private evictStale() {
    const now = Date.now();
    for (const [key, ts] of this.lastFired) {
      if (now - ts > 600_000) {
        // 10 min stale cleanup
        this.lastFired.delete(key);
      }
    }
  }
}
