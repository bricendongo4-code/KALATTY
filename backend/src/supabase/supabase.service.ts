import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  public client: any;
  public authClient: any;

  constructor(private readonly configService: ConfigService) {
    const url =
      this.configService.get<string>('SUPABASE_URL') ??
      this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    const publicKey =
      this.configService.get<string>('SUPABASE_KEY') ??
      this.configService.get<string>(
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
      );

    this.client = createClient(
      url as string,
      (serviceRoleKey ?? publicKey) as string,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    this.authClient = createClient(url as string, publicKey as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
}
