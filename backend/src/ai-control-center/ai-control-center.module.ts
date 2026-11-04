import { AgentOrchestratorService } from './agent-orchestrator.service';
import { OrchestrationController } from './orchestration.controller';
import { PlatformOwnerGuard } from '../agent-growth/platform-owner.guard';
import { AgentSupervisionService } from './agent-supervision.service';
import { AgentImplementationService } from './agent-implementation.service';
import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiControlCenterController } from './ai-control-center.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [AiControlCenterController, OrchestrationController],
  providers: [
    AgentSupervisionService,
    AgentImplementationService,
    AgentOrchestratorService,
    PlatformOwnerGuard,
  ],
})
export class AiControlCenterModule {}
