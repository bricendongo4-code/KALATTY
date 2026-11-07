import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from './supabase/supabase.service';

const READINESS_TIMEOUT_MS = 3_000;

@Injectable()
export class AppService {
  constructor(private readonly supabaseService: SupabaseService) {}

  getHello(): string {
    return 'Kalatty API';
  }

  getLiveness() {
    return {
      status: 'ok',
      service: 'kalatty-backend',
      version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), READINESS_TIMEOUT_MS);
    try {
      const { error } = await this.supabaseService.client
        .from('profiles')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal);
      if (error) throw error;
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        service: 'kalatty-backend',
        checks: { database: 'unavailable' },
        timestamp: new Date().toISOString(),
      });
    } finally {
      clearTimeout(timeout);
    }
    return {
      ...this.getLiveness(),
      checks: { database: 'ok' },
      latencyMs: Date.now() - startedAt,
    };
  }
}
