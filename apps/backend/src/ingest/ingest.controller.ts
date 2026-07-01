import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  PayloadTooLargeException,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { timingSafeEqual } from 'crypto';
import { Public } from '../auth/public.decorator';
import { INGEST_QUEUE } from '../workers/workers.module';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { IngestDataDto } from '../dtos/ingest.dto';

@Public()
@Throttle({ default: { limit: 300, ttl: 60_000 } })
@Controller('ingest')
export class IngestController {
  constructor(
    @InjectQueue(INGEST_QUEUE) private readonly ingestQueue: Queue,
    private readonly apiKeys: ApiKeysService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async ingest(
    @Body() rawBody: Record<string, unknown>,
    @Headers('x-api-key') apiKey: string,
  ) {
    const serialized = JSON.stringify(rawBody);
    if (serialized.length > 1024 * 100) {
      throw new PayloadTooLargeException('Payload exceeds 100KB limit');
    }
    if (!apiKey) {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    // Validate known fields while preserving unknown fields for raw storage
    const dto = plainToInstance(IngestDataDto, rawBody);
    try {
      await validateOrReject(dto);
    } catch (errors) {
      throw new BadRequestException('Invalid ingest payload');
    }

    if (!dto.serverId) {
      throw new BadRequestException('serverId is required');
    }

    // Check master key first (env var)
    const masterKey = process.env.AGENT_API_KEY;
    if (masterKey && apiKey.length === masterKey.length && timingSafeEqual(Buffer.from(apiKey), Buffer.from(masterKey))) {
      await this.ingestQueue.add('metrics', rawBody, {
        removeOnComplete: { age: 3600 },
      });
      return { accepted: true };
    }

    // Check per-server API keys in database
    const result = await this.apiKeys.validate(apiKey);
    if (result.valid) {
      // If key is scoped to a server, verify the data matches
      if (result.serverId && dto.serverId && dto.serverId !== result.serverId) {
        throw new UnauthorizedException('API key is not authorized for this server');
      }
      await this.ingestQueue.add('metrics', rawBody, {
        removeOnComplete: { age: 3600 },
      });
      return { accepted: true };
    }

    throw new UnauthorizedException('Invalid API key');
  }
}
