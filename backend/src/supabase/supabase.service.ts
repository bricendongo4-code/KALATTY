import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

@Injectable()
export class SupabaseService {
  public readonly client: SupabaseClient<Database>;
  public readonly authClient: SupabaseClient<Database>;

  constructor(configService: ConfigService) {
    const url =
      configService.get<string>('SUPABASE_URL') ??
      configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    const serviceRoleKey = configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    const publicKey =
      configService.get<string>('SUPABASE_KEY') ??
      configService.get<string>('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');

    if (!url) {
      throw new Error(
        'SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL) doit etre defini.',
      );
    }

    if (!serviceRoleKey && !publicKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_KEY doit etre defini.',
      );
    }

    this.client = createClient(url, serviceRoleKey ?? publicKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    this.authClient = createClient(url, publicKey ?? serviceRoleKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
}
