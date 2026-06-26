import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { INGEST_QUEUE } from '../workers/workers.module';

@Controller('ingest')
export class IngestController {
  constructor(
    @InjectQueue(INGEST_QUEUE) private readonly ingestQueue: Queue,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async ingest(
    @Body() data: Record<string, unknown>,
    @Headers('x-api-key') apiKey: string,
  ) {
    const expectedKey = process.env.AGENT_API_KEY;
    if (expectedKey && apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    await this.ingestQueue.add('metrics', data, {
      removeOnComplete: { age: 3600 },
    });

    return { accepted: true };
  }
}
