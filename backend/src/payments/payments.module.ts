import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import {
  PaymentsController,
  PaymentsWebhookController,
} from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [SupabaseModule],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
