import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { MetricSnapshotEntity } from '../database/entities/metric-snapshot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MetricSnapshotEntity])],
  controllers: [HealthController],
})
export class HealthModule {}
