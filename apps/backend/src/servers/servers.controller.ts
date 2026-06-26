import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServersService } from './servers.service';
import { MetricSnapshotEntity } from '../database/entities/metric-snapshot.entity';

@Controller('servers')
export class ServersController {
  private readonly logger = new Logger(ServersController.name);

  constructor(
    private readonly servers: ServersService,
    @InjectRepository(MetricSnapshotEntity)
    private readonly metricRepo?: Repository<MetricSnapshotEntity>,
  ) {}

  @Get()
  async findAll() {
    return this.servers.getAll();
  }

  @Get(':serverId/processes')
  async getProcesses(@Param('serverId') serverId: string) {
    if (!this.metricRepo) return [];
    try {
      const snapshot = await this.metricRepo.findOne({
        where: { serverId },
        order: { timestamp: 'DESC' },
      });
      return snapshot?.processes || [];
    } catch {
      return [];
    }
  }

  @Get(':serverId/metrics')
  async getMetrics(
    @Param('serverId') serverId: string,
    @Query('limit') limit?: string,
  ) {
    if (!this.metricRepo) return [];
    try {
      const snapshots = await this.metricRepo.find({
        where: { serverId },
        order: { timestamp: 'DESC' },
        take: Math.min(Number(limit) || 60, 500),
      });
      return snapshots.reverse().map((s) => ({
        timestamp: s.timestamp.getTime(),
        cpu: s.cpu,
        memory: s.memory,
        disk: s.disk,
        networkIn: s.networkIn,
        networkOut: s.networkOut,
      }));
    } catch {
      return [];
    }
  }
}
