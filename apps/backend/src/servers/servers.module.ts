import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServerEntity } from '../database/entities/server.entity';
import { MetricSnapshotEntity } from '../database/entities/metric-snapshot.entity';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ServerEntity, MetricSnapshotEntity])],
  controllers: [ServersController],
  providers: [ServersService],
  exports: [ServersService],
})
export class ServersModule {}
