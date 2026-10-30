import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

type AuthenticatedRequest = { user?: { id?: string; role?: string } };

const AGENTS = [
  'security', 'qa', 'developer', 'ux', 'product', 'marketing',
  'sales', 'support', 'finance', 'analytics', 'crm',
] as const;

/**
 * Read-only metadata endpoint. No production reports or secrets are returned.
 * JWT authentication and platform administrator authorization are mandatory.
 * Institution administrators must not access global agent telemetry. A dedicated platform_admin role must be provisioned and verified before use.
 */
@Controller('ai-control-center')
@UseGuards(AuthGuard('jwt'))
export class AiControlCenterController {
  @Get('catalog')
  catalog(@Req() req: AuthenticatedRequest) {
    if (!req.user?.id || req.user.role !== 'platform_admin') {
      throw new ForbiddenException('Platform administrator access required');
    }
    return {
      version: 1,
      dataMode: 'catalog-only',
      liveMonitoringEnabled: false,
      mergeAuthorized: false,
      deployAuthorized: false,
      reportsConnected: false,
      agents: AGENTS.map(department => ({
        department,
        status: 'not-connected',
        reviewRequired: false,
      })),
    };
  }
}
