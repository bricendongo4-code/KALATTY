import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiControlCenterController } from './ai-control-center.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [AiControlCenterController],
})
export class AiControlCenterModule {}
