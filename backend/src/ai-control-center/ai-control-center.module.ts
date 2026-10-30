import { Module } from '@nestjs/common';
import { AiControlCenterController } from './ai-control-center.controller';

@Module({
  controllers: [AiControlCenterController],
})
export class AiControlCenterModule {}
