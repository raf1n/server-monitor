import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class DatabaseInitService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitService.name);

  private get userRepo() {
    return this.dataSource.getRepository(UserEntity);
  }

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      await this.setupHypertables();
    } catch (err) {
      this.logger.warn(`Hypertable setup skipped: ${(err as Error).message}`);
    }
    try {
      await this.seedAdminUser();
    } catch (err) {
      this.logger.warn(`Admin user seeding skipped: ${(err as Error).message}`);
    }
  }

  private async ensureInitialized() {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
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
          "SELECT add_compression_policy($1, INTERVAL '1 day', if_not_exists => TRUE)",
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

    this.logger.log(`TimescaleDB hypertables configured with ${retentionDays}-day retention`);
  }

  private async seedAdminUser() {
    const count = await this.userRepo.count();
    if (count === 0) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD;
      if (!password) {
        this.logger.error('ADMIN_PASSWORD environment variable is required when no users exist.');
        throw new Error('ADMIN_PASSWORD is required');
      }
      const hash = await bcrypt.hash(password, 10);
      await this.userRepo.save({ username, password: hash, role: 'admin' });
      this.logger.log(`Default admin user created: ${username}`);
    } else {
      const adminCount = await this.userRepo.count({
        where: { role: 'admin' as any },
      });
      if (adminCount === 0) {
        const firstUser = await this.userRepo.findOne({
          where: {},
          order: { createdAt: 'ASC' } as any,
        });
        if (firstUser) {
          firstUser.role = 'admin' as any;
          await this.userRepo.save(firstUser);
          this.logger.log(`Promoted existing user to admin: ${firstUser.username}`);
        }
      }
    }
  }
}
