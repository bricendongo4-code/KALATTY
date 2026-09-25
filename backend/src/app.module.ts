import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CampusModule } from './campus/campus.module';
import { CoursesModule } from './courses/courses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { MobileModule } from './mobile/mobile.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { SupabaseModule } from './supabase/supabase.module';
import { StudioModule } from './studio/studio.module';
import { PrivacyModule } from './privacy/privacy.module';
import { ObservabilityMiddleware } from './observability.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // <<< OBLIGATOIRE !!
    SupabaseModule,
    AuthModule,
    CampusModule,
    CoursesModule,
    DashboardModule,
    InstitutionsModule,
    NotificationsModule,
    MobileModule,
    PaymentsModule,
    StudioModule,
    PrivacyModule,
  ],
  controllers: [AppController],
  providers: [AppService, ObservabilityMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ObservabilityMiddleware).forRoutes('*');
  }
}
