import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

@Module({
  imports: [
    SupabaseModule,
    DashboardModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [MobileController],
  providers: [MobileService],
})
export class MobileModule {}
