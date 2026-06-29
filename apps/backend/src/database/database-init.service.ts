import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.migrateUserRoleColumn();
    } catch (err) {
      this.logger.warn(
        `User role migration skipped: ${(err as Error).message}`,
      );
    }
    try {
      await this.migrateApiKeysTable();
    } catch (err) {
      this.logger.warn(`Api keys migration skipped: ${(err as Error).message}`);
    }
    try {
      await this.setupHypertables();
    } catch (err) {
      this.logger.warn(`Hypertable setup skipped: ${(err as Error).message}`);
    }
  }

  private async ensureInitialized() {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
  }

  private async migrateUserRoleColumn() {
    await this.ensureInitialized();

    const columnExists = await this.dataSource.query(
      'SELECT 1 FROM information_schema.columns WHERE table_name = \'users\' AND column_name = \'role\'',
    );

    if (columnExists.length === 0) {
      this.logger.log('Adding role column to users table...');
      await this.dataSource.query(
        'ALTER TABLE "users" ADD COLUMN "role" varchar NOT NULL DEFAULT \'viewer\'',
      );
      this.logger.log('Role column added successfully');
    }
  }

  private async migrateApiKeysTable() {
    await this.ensureInitialized();

    const tableExists = await this.dataSource.query(
      'SELECT 1 FROM information_schema.tables WHERE table_name = \'api_keys\'',
    );

    if (tableExists.length === 0) {
      this.logger.log('Creating api_keys table...');
      await this.dataSource.query(`
        CREATE TABLE "api_keys" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "keyHash" varchar NOT NULL,
          "keyPrefix" varchar(8) NOT NULL,
          "serverId" varchar,
          "label" varchar,
          "revoked" boolean NOT NULL DEFAULT false,
          "lastUsedAt" timestamptz,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(
        'CREATE INDEX "IDX_api_keys_serverId" ON "api_keys" ("serverId")',
      );
      this.logger.log('api_keys table created');
    }
  }

  private async setupHypertables() {
    await this.ensureInitialized();

    const retentionDays = Number(process.env.METRICS_RETENTION_DAYS) || 7;

    const hypertables = [{ table: 'metric_snapshots', column: 'timestamp' }];

    for (const { table, column } of hypertables) {
      const exists = await this.dataSource.query(
        'SELECT 1 FROM _timescaledb_catalog.hypertable WHERE table_name = $1',
        [table],
      );

      if (exists.length === 0) {
        this.logger.log(`Converting ${table} to hypertable...`);
        await this.dataSource.query(
          'SELECT create_hypertable($1, $2, if_not_exists => TRUE, migrate_data => TRUE)',
          [table, column],
        );

        await this.dataSource.query(
          'SELECT add_compression_policy($1, INTERVAL \'1 day\', if_not_exists => TRUE)',
          [table],
        );

        this.logger.log(`Set ${table} retention to ${retentionDays} days`);
      } else {
        this.logger.log(`${table} is already a hypertable`);
      }

      await this.dataSource.query(
        'SELECT add_retention_policy($1, make_interval(days => $2), if_not_exists => TRUE)',
        [table, retentionDays],
      );
    }

    this.logger.log(
      `TimescaleDB hypertables configured with ${retentionDays}-day retention`,
    );
  }
}
