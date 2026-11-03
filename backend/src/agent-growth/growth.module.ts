import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { GrowthController } from './growth.controller';
import { GrowthService } from './growth.service';
import { PlatformOwnerGuard } from './platform-owner.guard';
@Module({
  imports: [SupabaseModule],
  controllers: [GrowthController],
  providers: [GrowthService, PlatformOwnerGuard],
})
export class GrowthModule {}
