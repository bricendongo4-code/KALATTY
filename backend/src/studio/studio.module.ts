import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { StudioController } from './studio.controller';
import { StudioService } from './studio.service';

@Module({
  imports: [SupabaseModule],
  controllers: [StudioController],
  providers: [StudioService],
})
export class StudioModule {}
