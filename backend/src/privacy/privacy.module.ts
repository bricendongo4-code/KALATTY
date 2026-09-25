import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';

@Module({
  imports: [SupabaseModule],
  controllers: [PrivacyController],
  providers: [PrivacyService],
})
export class PrivacyModule {}
