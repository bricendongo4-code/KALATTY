import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PlatformOwnerGuard } from '../agent-growth/platform-owner.guard';
import {
  CommerceController,
  CommerceOwnerController,
} from './commerce.controller';
import { CommerceService } from './commerce.service';
@Module({
  imports: [SupabaseModule],
  controllers: [CommerceController, CommerceOwnerController],
  providers: [CommerceService, PlatformOwnerGuard],
})
export class CommerceModule {}
