import {
  Controller,
  Get,
  Param,
  Query,
  Logger,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { ServersService } from "./servers.service";
import { MetricSnapshotEntity } from "../database/entities/metric-snapshot.entity";
import { ListMetricsQuery } from "../dtos/servers.dto";

const RANGE_TO_MS: Record<string, number> = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

@Controller("servers")
export class ServersController {
  private readonly logger = new Logger(ServersController.name);

  constructor(
    private readonly servers: ServersService,
    @Optional()
    @InjectRepository(MetricSnapshotEntity)
    private readonly metricRepo?: Repository<MetricSnapshotEntity>,
  ) {}

  @Get()
  async findAll() {
    return this.servers.getAll();
  }

  @Get(":serverId/processes")
  async getProcesses(@Param("serverId") serverId: string) {
    if (!this.metricRepo) return [];
    try {
      const snapshot = await this.metricRepo.findOne({
        where: { serverId },
        order: { timestamp: "DESC" },
      });
      return snapshot?.processes || [];
    } catch (err) {
      this.logger.error(
        `Failed to fetch processes for ${serverId}: ${(err as Error).message}`,
      );
      return [];
    }
  }

  @Get(":serverId/metrics/latest")
  async getLatest(@Param("serverId") serverId: string) {
    if (!this.metricRepo) return null;
    try {
      const snapshot = await this.metricRepo.findOne({
        where: { serverId },
        order: { timestamp: "DESC" },
      });
      if (!snapshot) return null;
      return snapshot.raw;
    } catch {
      return null;
    }
  }

  @Get(":serverId/metrics")
  async getMetrics(
    @Param("serverId") serverId: string,
    @Query() query: ListMetricsQuery,
  ) {
    if (!this.metricRepo) return [];
    try {
      const where: any = { serverId };
      const rangeMs = query.range ? RANGE_TO_MS[query.range] : undefined;
      if (rangeMs) {
        where.timestamp = MoreThan(new Date(Date.now() - rangeMs));
      }

      // Determine display limit from agent interval when range is known
      let displayLimit: number;
      if (rangeMs) {
        const server = await this.servers.getById(serverId);
        const intervalMs =
          (server as any)?.intervalMs ?? (server as any)?.agentIntervalMs;
        if (intervalMs && intervalMs > 0) {
          const expectedCount = Math.floor(rangeMs / intervalMs);
          displayLimit = Math.min(Math.max(expectedCount, 1), 96);
        } else {
          displayLimit = Math.min(Number(query.limit) || 200, 96);
        }
      } else {
        displayLimit = Math.min(Number(query.limit) || 200, 500);
      }

      let take = displayLimit;
      if (rangeMs) {
        const count = await this.metricRepo.count({ where });
        take = Math.min(Math.max(count, displayLimit), 5000);
      }
      const snapshots = await this.metricRepo.find({
        where,
        order: { timestamp: "ASC" },
        take,
      });
      const sampled =
        snapshots.length <= displayLimit
          ? snapshots
          : Array.from(
              { length: displayLimit },
              (_, i) =>
                snapshots[
                  Math.floor((i * (snapshots.length - 1)) / (displayLimit - 1))
                ],
            );
      return sampled.map((s) => ({
        timestamp: s.timestamp.getTime(),
        cpu: s.cpu,
        memory: s.memory,
        disk: s.disk,
        networkIn: s.networkIn,
        networkOut: s.networkOut,
      }));
    } catch (err) {
      this.logger.error(
        `Failed to fetch metrics for ${serverId}: ${(err as Error).message}`,
      );
      return [];
    }
  }
}
