import { AgentSupervisionService } from './agent-supervision.service';
import { AgentImplementationService } from './agent-implementation.service';
import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiControlCenterController } from './ai-control-center.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [AiControlCenterController],
  providers: [AgentSupervisionService, AgentImplementationService],
})
export class AiControlCenterModule {}
