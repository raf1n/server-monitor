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
import { Public } from '../auth/public.decorator';
import { INGEST_QUEUE } from '../workers/workers.module';
import { ApiKeysService } from '../api-keys/api-keys.service';

@Public()
@Controller('ingest')
export class IngestController {
  constructor(
    @InjectQueue(INGEST_QUEUE) private readonly ingestQueue: Queue,
    private readonly apiKeys: ApiKeysService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async ingest(
    @Body() data: Record<string, unknown>,
    @Headers('x-api-key') apiKey: string,
  ) {
    if (!apiKey) {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    // Check master key first (env var)
    const masterKey = process.env.AGENT_API_KEY;
    if (masterKey && apiKey === masterKey) {
      await this.ingestQueue.add('metrics', data, {
        removeOnComplete: { age: 3600 },
      });
      return { accepted: true };
    }

    // Check per-server API keys in database
    const result = await this.apiKeys.validate(apiKey);
    if (result.valid) {
      // If key is scoped to a server, verify the data matches
      if (result.serverId && data.serverId && data.serverId !== result.serverId) {
        throw new UnauthorizedException('API key is not authorized for this server');
      }
      await this.ingestQueue.add('metrics', data, {
        removeOnComplete: { age: 3600 },
      });
      return { accepted: true };
    }

    throw new UnauthorizedException('Invalid API key');
  }
}
