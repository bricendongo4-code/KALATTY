import { Module } from '@nestjs/common';
import { CampusModule } from '../campus/campus.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
@Module({
  imports: [CampusModule, SupabaseModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
