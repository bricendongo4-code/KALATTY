import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: {} })),
}));

import { createClient } from '@supabase/supabase-js';

describe('SupabaseService security boundaries', () => {
  beforeEach(() => jest.clearAllMocks());

  it('refuses to initialize auth with a privileged-only key', () => {
    const config = { get: (key: string) => ({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'privileged-test-key',
    })[key] } as ConfigService;
    expect(() => new SupabaseService(config)).toThrow(/SUPABASE_KEY/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('always uses the public key for authClient', () => {
    const config = { get: (key: string) => ({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'privileged-test-key',
      SUPABASE_KEY: 'public-test-key',
    })[key] } as ConfigService;
    new SupabaseService(config);
    expect(createClient).toHaveBeenNthCalledWith(1, 'https://example.supabase.co', 'privileged-test-key', expect.any(Object));
    expect(createClient).toHaveBeenNthCalledWith(2, 'https://example.supabase.co', 'public-test-key', expect.any(Object));
  });
});
