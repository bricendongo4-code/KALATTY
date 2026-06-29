import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

type RequestUser = {
  user: {
    id: string;
    role?: string;
  };
};

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() req: RequestUser) {
    return this.notificationsService.listForUser(req.user);
  }

  @Patch(':notificationId/read')
  markRead(
    @Req() req: RequestUser,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markRead(req.user, notificationId);
  }
}
