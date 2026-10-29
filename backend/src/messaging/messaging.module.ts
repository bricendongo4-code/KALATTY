import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';

@Module({
  imports: [SupabaseModule],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
