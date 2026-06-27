import { Controller, Get, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Inject } from "@nestjs/common";
import { REDIS_PUBLISHER } from "../redis/redis.module";
import { Public } from "../auth/public.decorator";
import type Redis from "ioredis";
import { MetricSnapshotEntity } from "../database/entities/metric-snapshot.entity";

@Public()
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @InjectRepository(MetricSnapshotEntity)
    private readonly metricRepo?: Repository<MetricSnapshotEntity>,
    @Inject(REDIS_PUBLISHER) private readonly redis?: Redis,
  ) {}

  @Get()
  async check() {
    const status: Record<string, string> = {};

    // DB check
    if (this.metricRepo) {
      try {
        await this.metricRepo.findOne({
          where: {},
          order: { timestamp: "DESC" },
        });
        status.database = "ok";
      } catch {
        status.database = "error";
      }
    } else {
      status.database = "not_configured";
    }

    // Redis check
    if (this.redis) {
      try {
        await this.redis.ping();
        status.redis = "ok";
      } catch {
        status.redis = "error";
      }
    } else {
      status.redis = "not_configured";
    }

    const healthy = Object.values(status).every((s) => s === "ok");
    return { status: healthy ? "ok" : "degraded", checks: status };
  }
}
