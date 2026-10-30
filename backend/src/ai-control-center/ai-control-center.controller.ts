import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpException, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SupabaseService } from '../supabase/supabase.service';

type AuthenticatedRequest = { user?: { id?: string; role?: string; email?: string } };
const AGENTS = ['security','qa','developer','ux','product','marketing','sales','support','finance','analytics','crm'] as const;
const permitted = new Set<string>(AGENTS);
type SafeAgent = {
  department: string; status: 'reported' | 'error'; findings: number; queue: number;
  reviewRequired: boolean; dataMode: 'synthetic' | 'unverified';
};
type SafeReport = {
  version: 2; generatedAt: string; dataMode: 'synthetic' | 'unverified';
  summary: { total: number; reported: number; errors: number; reviewRequired: number };
  departments: SafeAgent[];
  errors: { department: string; code: string; message: string }[];
  mergeAuthorized: false; deployAuthorized: false; liveMonitoringEnabled: false;
};
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function count(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new BadRequestException('Invalid report count');
  return value as number;
}
/** Only aggregate counters and bounded diagnostic codes are retained: no raw report payloads or PII. */
function sanitize(input: unknown): SafeReport {
  if (!isRecord(input) || input.version !== 2 || !Array.isArray(input.departments) ||
      !Array.isArray(input.errors) || !isRecord(input.summary) ||
      input.mergeAuthorized !== false || input.deployAuthorized !== false ||
      input.liveMonitoringEnabled !== false) throw new BadRequestException('Invalid read-only report');
  if (input.dataMode !== 'synthetic' && input.dataMode !== 'unverified') throw new BadRequestException('Invalid data mode');
  if (typeof input.generatedAt !== 'string' || !Number.isFinite(Date.parse(input.generatedAt))) throw new BadRequestException('Invalid report timestamp');
  if (input.departments.length > AGENTS.length || input.errors.length > AGENTS.length) throw new BadRequestException('Too many report entries');
  const mode = input.dataMode as 'synthetic' | 'unverified';
  const reportSummary = input.summary as Record<string, unknown>;
  const seen = new Set<string>();
  const departments: SafeAgent[] = input.departments.map((value: unknown) => {
    if (!isRecord(value) || typeof value.department !== 'string' || !permitted.has(value.department) ||
        seen.has(value.department) || (value.status !== 'reported' && value.status !== 'error') ||
        typeof value.reviewRequired !== 'boolean' || value.dataMode !== input.dataMode) {
      throw new BadRequestException('Invalid agent entry');
    }
    seen.add(value.department);
    return { department: value.department, status: value.status, findings: count(value.findings),
      queue: count(value.queue), reviewRequired: value.reviewRequired, dataMode: mode };
  });
  const errors = input.errors.map((value: unknown) => {
    if (!isRecord(value) || typeof value.department !== 'string' || !seen.has(value.department) ||
        typeof value.code !== 'string' || value.code.length > 64 ||
        !/^[A-Z0-9_]+$/.test(value.code)) throw new BadRequestException('Invalid diagnostic entry');
    // Explicitly discard raw error messages, which can contain secrets and personal data.
    return { department: value.department, code: value.code, message: 'Diagnostic available in restricted CI logs' };
  });
  const summary = { total: departments.length,
    reported: departments.filter(d => d.status === 'reported').length,
    errors: errors.length, reviewRequired: departments.filter(d => d.reviewRequired).length };
  if (Object.entries(summary).some(([key, value]) => reportSummary[key] !== value)) throw new BadRequestException('Inconsistent summary');
  return { version: 2, generatedAt: input.generatedAt, dataMode: input.dataMode, summary,
    departments, errors, mergeAuthorized: false, deployAuthorized: false, liveMonitoringEnabled: false };
}

@Controller('ai-control-center')
@UseGuards(AuthGuard('jwt'))
export class AiControlCenterController {
  constructor(private readonly supabase: SupabaseService) {}

  private async requirePlatformAdmin(req: AuthenticatedRequest): Promise<string> {
    const id = req.user?.id;
    const email = req.user?.email?.trim().toLowerCase();
    const allowed = (process.env.KALATTY_PLATFORM_ADMIN_EMAIL ?? '').trim().toLowerCase();
    // Fail closed if the deployment has not configured an explicit platform owner.
    if (!id || !email || !allowed || email !== allowed) {
      throw new ForbiddenException('Platform administrator access required');
    }
    // A signed Kalatty JWT is necessary but insufficient: verify the identity against
    // Supabase Auth rather than trusting profile roles or user-editable metadata.
    const { data, error } = await this.supabase.client.auth.admin.getUserById(id);
    if (error || !data.user || data.user.email?.trim().toLowerCase() !== allowed ||
        !data.user.email_confirmed_at) {
      throw new ForbiddenException('Platform administrator access required');
    }
    return id;
  }

  @Get('catalog')
  async catalog(@Req() req: AuthenticatedRequest) {
    await this.requirePlatformAdmin(req);
    return { version: 1, dataMode: 'catalog-only', liveMonitoringEnabled: false,
      mergeAuthorized: false, deployAuthorized: false, reportsConnected: false,
      agents: AGENTS.map(department => ({ department, status: 'not-connected', reviewRequired: false })) };
  }

  @Get('reports')
  async reports(@Req() req: AuthenticatedRequest) {
    await this.requirePlatformAdmin(req);
    const { data, error } = await this.supabase.client.from('ai_agent_reports' as never)
      .select('id,created_at,generated_at,data_mode,report').order('created_at', { ascending: false }).limit(20);
    if (error) throw new HttpException('Report storage unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    return { reports: data ?? [], liveMonitoringEnabled: false };
  }

  @Post('reports')
  async submit(@Req() req: AuthenticatedRequest, @Body() input: unknown) {
    const userId = await this.requirePlatformAdmin(req);
    const report = sanitize(input);
    const { data, error } = await this.supabase.client.from('ai_agent_reports' as never)
      .insert({ generated_at: report.generatedAt, data_mode: report.dataMode,
        report, submitted_by: userId } as never).select('id,created_at').single();
    if (error) throw new HttpException('Report storage unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    return { stored: true, receipt: data };
  }
}
