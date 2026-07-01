import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ServerEntity } from './entities/server.entity';
import { MetricSnapshotEntity } from './entities/metric-snapshot.entity';
import { AlertEntity } from './entities/alert.entity';
import { NotificationEntity } from './entities/notification.entity';
import { SettingsEntity } from './entities/settings.entity';
import { UserEntity } from './entities/user.entity';
import { ApiKeyEntity } from './entities/api-key.entity';
import { DatabaseInitService } from './database-init.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: Number(config.get('DB_PORT', 5432)),
        username: config.get('DB_USER', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'server_monitor'),
        entities: [
          ServerEntity,
          MetricSnapshotEntity,
          AlertEntity,
          NotificationEntity,
          SettingsEntity,
          UserEntity,
          ApiKeyEntity,
        ],
        synchronize:
          config.get('DB_SYNCHRONIZE') === 'true' ||
          (config.get('NODE_ENV') !== 'production' &&
            config.get('DB_SYNCHRONIZE') !== 'false'),
        retryAttempts: 5,
        retryDelay: 3000,
        extra: {
          max: Number(config.get('DB_POOL_MAX', 20)),
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),
  ],
  providers: [DatabaseInitService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
