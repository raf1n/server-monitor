import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestController } from './ingest.controller';
import { INGEST_QUEUE } from '../workers/workers.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: INGEST_QUEUE }),
  ],
  controllers: [IngestController],
})
export class IngestModule {}
