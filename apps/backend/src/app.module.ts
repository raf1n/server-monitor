import { Module } from '@nestjs/common';
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

@Module({
  imports: [
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
  ],
})
export class AppModule {}
