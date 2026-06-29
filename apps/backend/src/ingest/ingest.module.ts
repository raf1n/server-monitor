import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestController } from './ingest.controller';
import { INGEST_QUEUE } from '../workers/workers.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [BullModule.registerQueue({ name: INGEST_QUEUE }), ApiKeysModule],
  controllers: [IngestController],
})
export class IngestModule {}
