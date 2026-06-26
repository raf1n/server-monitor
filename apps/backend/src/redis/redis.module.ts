import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_PUBLISHER = 'REDIS_PUBLISHER';
export const REDIS_SUBSCRIBER = 'REDIS_SUBSCRIBER';

function redisFactory(config: ConfigService): Redis {
  return new Redis({
    host: config.get('REDIS_HOST', 'localhost'),
    port: config.get('REDIS_PORT', 6379),
    maxRetriesPerRequest: null,
  });
}

@Global()
@Module({
  providers: [
    { provide: REDIS_PUBLISHER, inject: [ConfigService], useFactory: redisFactory },
    { provide: REDIS_SUBSCRIBER, inject: [ConfigService], useFactory: redisFactory },
  ],
  exports: [REDIS_PUBLISHER, REDIS_SUBSCRIBER],
})
export class RedisModule {}
