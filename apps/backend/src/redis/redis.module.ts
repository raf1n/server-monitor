import { Module, Global, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_PUBLISHER = 'REDIS_PUBLISHER';
export const REDIS_SUBSCRIBER = 'REDIS_SUBSCRIBER';

function redisFactory(config: ConfigService): Redis {
  return new Redis({
    host: config.get('REDIS_HOST', 'localhost'),
    port: config.get('REDIS_PORT', 6379),
    password: config.get('REDIS_PASSWORD') || undefined,
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}

const publisherProvider = {
  provide: REDIS_PUBLISHER,
  inject: [ConfigService],
  useFactory: redisFactory,
};

const subscriberProvider = {
  provide: REDIS_SUBSCRIBER,
  inject: [ConfigService],
  useFactory: redisFactory,
};

@Global()
@Module({
  providers: [publisherProvider, subscriberProvider],
  exports: [REDIS_PUBLISHER, REDIS_SUBSCRIBER],
})
export class RedisModule implements OnModuleDestroy {
  private readonly logger = new Logger(RedisModule.name);

  constructor(
    @Inject(REDIS_PUBLISHER) private readonly pub: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly sub: Redis,
  ) {}

  async onModuleDestroy() {
    this.logger.log('Closing Redis connections...');
    await Promise.allSettled([this.pub.quit(), this.sub.quit()]);
  }
}
