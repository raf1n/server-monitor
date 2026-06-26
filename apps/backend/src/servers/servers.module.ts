import { Global, Module } from '@nestjs/common';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';

@Global()
@Module({
  controllers: [ServersController],
  providers: [ServersService],
  exports: [ServersService],
})
export class ServersModule {}
