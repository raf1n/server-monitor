import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { IngestModule } from './ingest/ingest.module';
import { WebsocketModule } from './websocket/websocket.module';
import { WorkersModule } from './workers/workers.module';
import { ServersModule } from './servers/servers.module';
import { AgentDistributionModule } from './agent-distribution/agent-distribution.module';
import { AlertsModule } from './alerts/alerts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApiKeysModule } from './api-keys/api-keys.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    HealthModule,
    AuthModule,
    UsersModule,
    ConfigModule,
    RedisModule,
    DatabaseModule,
    IngestModule,
    WebsocketModule,
    WorkersModule,
    ServersModule,
    AgentDistributionModule,
    AlertsModule,
    NotificationsModule,
    SettingsModule,
    ApiKeysModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
