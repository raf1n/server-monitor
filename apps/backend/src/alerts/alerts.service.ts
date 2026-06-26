import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, LessThan } from 'typeorm';
import { AlertEntity } from '../database/entities/alert.entity';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';

interface Thresholds {
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
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);
  // Track last-fired timestamp per server+alertKey for cooldown
  private lastFired = new Map<string, number>();

  constructor(
    @InjectRepository(AlertEntity)
    private readonly alertRepo: Repository<AlertEntity>,
    @Optional() private readonly settingsService?: SettingsService,
    @Optional() private readonly notificationsService?: NotificationsService,
  ) {}

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

    return this.alertRepo.find({
      where,
      order: { timestamp: 'DESC' },
      take: Math.min(params.limit || 100, 500),
      skip: params.offset || 0,
    });
  }

  async count(params: { serverId?: string; acknowledged?: boolean; severity?: string }): Promise<number> {
    const where: FindOptionsWhere<AlertEntity> = {};
    if (params.serverId) where.serverId = params.serverId;
    if (params.acknowledged !== undefined) where.acknowledged = params.acknowledged;
    if (params.severity) where.severity = params.severity;
    return this.alertRepo.count({ where });
  }

  async findOne(id: string): Promise<AlertEntity | null> {
    return this.alertRepo.findOneBy({ id });
  }

  async findBySourceId(sourceId: string): Promise<AlertEntity | null> {
    return this.alertRepo.findOneBy({ sourceId });
  }

  async create(data: Partial<AlertEntity>): Promise<AlertEntity> {
    const alert = this.alertRepo.create({
      ...data,
      timestamp: data.timestamp || new Date(),
    });
    return this.alertRepo.save(alert);
  }

  async acknowledge(id: string): Promise<AlertEntity | null> {
    await this.alertRepo.update(id, { acknowledged: true });
    return this.findOne(id);
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

  async loadThresholds(): Promise<Thresholds> {
    if (!this.settingsService) return { ...DEFAULT_THRESHOLDS };
    const t = { ...DEFAULT_THRESHOLDS };
    const critical = await this.settingsService.get('criticalThreshold');
    if (critical) {
      const n = Number(critical);
      if (n > 0 && n <= 100) {
        t.cpuCritical = n;
        t.memCritical = n;
        t.cpuWarn = Math.max(n - 10, 30);
        t.memWarn = Math.max(n - 10, 30);
      }
    }
    const diskRaw = await this.settingsService.get('alert.threshold.disk');
    if (diskRaw) {
      const n = Number(diskRaw);
      if (n > 0 && n <= 100) t.diskCritical = n;
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

  async evaluateAndCreate(serverId: string, cpu: number, memory: number, disk: number): Promise<void> {
    const thresholds = await this.loadThresholds();
    const cooldownMs = (await this.loadCooldownMinutes()) * 60_000;
    const now = Date.now();

    const checks: Array<{ key: string; title: string; message: string; severity: string; fired: boolean }> = [];

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
      } catch (err) {
        this.logger.warn(`Failed to create alert for ${serverId}: ${(err as Error).message}`);
      }
    }

    // Clean up stale keys for this server
    for (const [key, ts] of this.lastFired) {
      if (key.endsWith(`:${serverId}`) && now - ts > cooldownMs * 2) {
        this.lastFired.delete(key);
      }
    }
  }
}
