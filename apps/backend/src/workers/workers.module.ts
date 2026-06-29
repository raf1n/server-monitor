import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MetricsProcessor } from './metrics.processor';
import { MetricSnapshotEntity } from '../database/entities/metric-snapshot.entity';
import { AlertsModule } from '../alerts/alerts.module';
import { NotificationsModule } from '../notifications/notifications.module';

export const INGEST_QUEUE = 'metrics-ingest';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
      defaultJobOptions: {
        removeOnComplete: { age: 3600 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
    BullModule.registerQueue({ name: INGEST_QUEUE }),
    TypeOrmModule.forFeature([MetricSnapshotEntity]),
    AlertsModule,
    NotificationsModule,
  ],
  providers: [MetricsProcessor],
})
export class WorkersModule {}
