import { Module, Global, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerEntity } from './entities/server.entity';
import { MetricSnapshotEntity } from './entities/metric-snapshot.entity';
import { AlertEntity } from './entities/alert.entity';
import { NotificationEntity } from './entities/notification.entity';
import { SettingsEntity } from './entities/settings.entity';
import { DatabaseInitService } from './database-init.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'server_monitor',
      entities: [ServerEntity, MetricSnapshotEntity, AlertEntity, NotificationEntity, SettingsEntity],
      synchronize: true,
      retryAttempts: 1,
      retryDelay: 1000,
    }),
    TypeOrmModule.forFeature([ServerEntity, MetricSnapshotEntity, AlertEntity, NotificationEntity, SettingsEntity]),
  ],
  providers: [DatabaseInitService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor() {
    this.logger.log(
      `Db config: postgres://${process.env.DB_USER || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'server_monitor'}`,
    );
  }
}
