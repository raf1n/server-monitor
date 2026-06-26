import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { REDIS_PUBLISHER } from '../redis/redis.module';
import { ServersService } from '../servers/servers.service';
import { MetricSnapshotEntity } from '../database/entities/metric-snapshot.entity';
import { AlertEntity } from '../database/entities/alert.entity';
import { AlertsService } from '../alerts/alerts.service';
import { NotificationsService } from '../notifications/notifications.service';
import type Redis from 'ioredis';

@Processor('metrics-ingest')
@Injectable()
export class MetricsProcessor extends WorkerHost {
  private readonly logger = new Logger(MetricsProcessor.name);

  constructor(
    @Inject(REDIS_PUBLISHER) private readonly redisPub: Redis,
    private readonly servers: ServersService,
    @InjectRepository(MetricSnapshotEntity)
    private readonly metricRepo?: Repository<MetricSnapshotEntity>,
    private readonly alertsService?: AlertsService,
    private readonly notificationsService?: NotificationsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const data = job.data as Record<string, unknown>;
    const serverId = data.serverId as string;
    if (!serverId) return;

    await this.servers.register(
      serverId,
      (data.host as string) || undefined,
      (data.name as string) || undefined,
    );

    if (this.metricRepo) {
      try {
        await this.metricRepo.save({
          serverId,
          cpu: (data.cpu as number) || 0,
          memory: (data.memory as number) || 0,
          memoryUsed: (data.memoryUsed as number) || 0,
          memoryTotal: (data.memoryTotal as number) || 0,
          disk: (data.disk as number) || 0,
          diskUsed: (data.diskUsed as number) || 0,
          diskTotal: (data.diskTotal as number) || 0,
          networkIn: (data.networkIn as number) || 0,
          networkOut: (data.networkOut as number) || 0,
          activeProcesses: (data.activeProcesses as number) || 0,
          loadAvg: (data.loadAvg as number[]) || [],
          uptime: (data.uptime as number) || 0,
          mounts: (data.mounts as Record<string, unknown>[]) || [],
          processes: (data.processes as Record<string, unknown>[]) || [],
          history: (data.history as Record<string, unknown>[]) || [],
          alerts: (data.alerts as Record<string, unknown>[]) || [],
          raw: data,
          timestamp: new Date((data.timestamp as number) || Date.now()),
        });
      } catch (e) {
        this.logger.warn(`DB save failed for ${serverId}: ${(e as Error).message}`);
      }
    }

    // Persist alerts from the agent data to the alerts table and dispatch notifications
    const incomingAlerts = data.alerts as Array<{ id?: string; title: string; message: string; severity: string; source?: string; timestamp?: number }> | undefined;
    if (incomingAlerts && incomingAlerts.length > 0 && this.alertsService) {
      try {
        for (const alertData of incomingAlerts) {
          if (alertData.id) {
            const existing = await this.alertsService.findBySourceId(alertData.id);
            if (existing) continue;
          }
          const alert = await this.alertsService.create({
            serverId,
            title: alertData.title,
            message: alertData.message,
            severity: alertData.severity,
            source: alertData.source || 'agent',
            sourceId: alertData.id,
            timestamp: new Date(alertData.timestamp || Date.now()),
            acknowledged: false,
          });

          if (this.notificationsService) {
            await this.notificationsService.dispatchFromAlert({
              id: alert.id,
              serverId,
              title: alert.title,
              message: alert.message,
              severity: alert.severity,
            });
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to persist alerts for ${serverId}: ${(e as Error).message}`);
      }
    }

    const channel = `stats:${serverId}`;
    await this.redisPub.publish(channel, JSON.stringify(data));
  }
}
