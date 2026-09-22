import { Module } from '@nestjs/common';
import { CampusController } from './campus.controller';
import { CampusService } from './campus.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [CampusController],
  providers: [CampusService],
})
export class CampusModule {}
