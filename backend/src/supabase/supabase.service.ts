import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  public client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    const url =
      this.configService.get<string>('SUPABASE_URL') ??
      this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    const key =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ??
      this.configService.get<string>('SUPABASE_KEY') ??
      this.configService.get<string>(
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
      );

    this.client = createClient(url as string, key as string);
  }
}
