import { analyzeWithBrain } from './department-brain';
import { planDepartments } from './department-planner';
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


  /**
   * Real database-backed operational signals, read-only and aggregate-only.
   * A count failure is explicitly reported as unavailable; never substituted with zero.
   * No raw learner, payment or message records leave this endpoint.
   */
  @Get('signals')
  async signals(@Req() req: AuthenticatedRequest) {
    await this.requirePlatformAdmin(req);
    const sources: Record<string, string[]> = {
      security: ['privacy_requests', 'institution_managed_users'],
      qa: ['assignment_submissions', 'course_activity_submissions'],
      developer: ['studio_ai_generations', 'studio_projects'],
      ux: ['progress', 'course_favorites'],
      product: ['courses', 'course_modules', 'lessons'],
      marketing: ['course_reviews', 'course_favorites'],
      sales: ['enrollments', 'payments'],
      support: ['course_questions', 'privacy_requests'],
      finance: ['payments'],
      analytics: ['enrollments', 'progress', 'courses'],
      crm: ['profiles', 'enrollments'],
    };
    const tables = [...new Set(Object.values(sources).flat())];
    const counts = await Promise.all(tables.map(async table => {
      try {
        const { count, error } = await this.supabase.client
          .from(table as never).select('*', { count: 'exact', head: true });
        if (error || count === null) return { table, available: false as const };
        return { table, available: true as const, count };
      } catch {
        return { table, available: false as const };
      }
    }));
    const byTable = new Map(counts.map(row => [row.table, row]));
    const agents = AGENTS.map(department => ({
      department,
      mode: 'real-aggregate-read-only' as const,
      sources: sources[department].map(table => byTable.get(table)),
      available: sources[department].every(table => byTable.get(table)?.available === true),
      autonomousActionsEnabled: false,
      humanReviewRequired: true,
    }));
    return { version: 1, generatedAt: new Date().toISOString(),
      dataMode: 'real-aggregate-read-only', liveMonitoringEnabled: false,
      mergeAuthorized: false, deployAuthorized: false, agents };
  }


  /**
   * Executable analysis (not autonomous writes): per-department evidence-based
   * recommendations, with explicit source completeness and approval gates.
   */
  @Get('recommendations')
  async recommendations(@Req() req: AuthenticatedRequest) {
    const snapshot = await this.signals(req);
    const agents = snapshot.agents.map(agent => {
      const available = agent.sources.filter(source => source?.available === true);
      const total = available.reduce((sum, source) =>
        sum + (source && 'count' in source ? source.count : 0), 0);
      const complete = agent.available;
      const action = !complete
        ? 'Verify database connectivity and source permissions before analysis.'
        : total === 0
          ? 'Review adoption and data ingestion for this department.'
          : 'Review operational trends and investigate notable changes against a previous snapshot.';
      return {
        department: agent.department,
        status: complete ? 'analysis-ready' : 'source-unavailable',
        evidence: available.map(source => ({
          table: source?.table, count: source && 'count' in source ? source.count : null,
        })),
        recommendation: action,
        confidence: complete ? 'limited-single-snapshot' : 'insufficient-data',
        approvalRequired: true,
        executedActions: 0,
      };
    });
    return {
      version: 1, generatedAt: snapshot.generatedAt,
      dataMode: 'real-aggregate-read-only',
      agents, autonomousWritesEnabled: false,
      limitations: ['No historical baseline', 'No raw record analysis', 'No external actions'],
    };
  }

  @Get('work-plan')
  async workPlan(@Req() req: AuthenticatedRequest) {
    const snapshot = await this.signals(req);
    return {
      version: 1,
      generatedAt: snapshot.generatedAt,
      source: 'live-supabase-aggregate-counts',
      agents: planDepartments(snapshot.agents),
      allTasksRequireApproval: true,
      externalActionsPerformed: false,
    };
  }

  @Post('analyze')
  async analyze(@Req() req: AuthenticatedRequest, @Body() input: unknown) {
    await this.requirePlatformAdmin(req);
    if (!isRecord(input) || typeof input.department !== 'string' ||
        !permitted.has(input.department)) throw new BadRequestException('Invalid department');
    const plans = await this.workPlan(req);
    const plan = plans.agents.find(agent => agent.department === input.department);
    if (!plan) throw new BadRequestException('Unknown department');
    return analyzeWithBrain(plan);
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
