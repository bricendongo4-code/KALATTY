import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getDashboard(@Req() req: { user: { id: string } }) {
    return this.dashboardService.getDashboard(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  updateProfile(
    @Req() req: { user: { id: string } },
    @Body()
    body: {
      fullname?: string;
      level?: string | null;
      school_name?: string | null;
      expertise?: string | null;
      bio?: string | null;
    },
  ) {
    return this.dashboardService.updateProfile(req.user.id, body);
  }
}
