import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [SupabaseModule],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
