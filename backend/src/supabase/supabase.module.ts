import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Module({
  providers: [
    SupabaseService,
    {
      provide: 'SUPABASE_CLIENT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url =
          configService.get<string>('SUPABASE_URL') ??
          configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
        const key =
          configService.get<string>('SUPABASE_KEY') ??
          configService.get<string>(
            'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
          );

        return createClient(url as string, key as string);
      },
    },
  ],
  exports: ['SUPABASE_CLIENT', SupabaseService],
})
export class SupabaseModule {}

