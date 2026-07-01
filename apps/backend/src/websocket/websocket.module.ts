import { Module } from '@nestjs/common';
import { StatsGateway } from './stats.gateway';
import { WsThrottlerGuard } from './ws-throttler.guard';

@Module({
  providers: [StatsGateway, WsThrottlerGuard],
  exports: [StatsGateway],
})
export class WebsocketModule {}
