import { Module } from '@nestjs/common';
import { AgentDistributionController } from './agent-distribution.controller';

@Module({
  controllers: [AgentDistributionController],
})
export class AgentDistributionModule {}
