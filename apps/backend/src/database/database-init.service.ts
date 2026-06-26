import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.setupHypertables();
    } catch (err) {
      this.logger.warn(`Hypertable setup skipped: ${(err as Error).message}`);
    }
  }

  private async setupHypertables() {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }

    const retentionDays = Number(process.env.METRICS_RETENTION_DAYS) || 7;

    const hypertables = [
      { table: 'metric_snapshots', column: 'timestamp' },
    ];

    for (const { table, column } of hypertables) {
      const exists = await this.dataSource.query(
        `SELECT 1 FROM _timescaledb_catalog.hypertable WHERE table_name = $1`,
        [table],
      );

      if (exists.length === 0) {
        this.logger.log(`Converting ${table} to hypertable...`);
        await this.dataSource.query(
          `SELECT create_hypertable('${table}', '${column}', if_not_exists => TRUE, migrate_data => TRUE)`,
        );

        await this.dataSource.query(
          `SELECT add_compression_policy('${table}', INTERVAL '1 day', if_not_exists => TRUE)`,
        );

        this.logger.log(`Set ${table} retention to ${retentionDays} days`);
      } else {
        this.logger.log(`${table} is already a hypertable`);
      }

      await this.dataSource.query(
        `SELECT add_retention_policy('${table}', INTERVAL '${retentionDays} days', if_not_exists => TRUE)`,
      );
    }

    this.logger.log(`TimescaleDB hypertables configured with ${retentionDays}-day retention`);
  }
}
