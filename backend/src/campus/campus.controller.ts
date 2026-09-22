import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CampusService } from './campus.service';
import {
  EndSessionDto,
  MarkAttendanceDto,
  StartSessionDto,
} from './dto/session-actions.dto';

type RequestUser = {
  user: {
    id: string;
    role?: string;
  };
};

@Controller('campus')
@UseGuards(AuthGuard('jwt'))
export class CampusController {
  constructor(private readonly campusService: CampusService) {}

  @Get('context')
  getContext(@Req() req: RequestUser) {
    return this.campusService.getContext(req.user);
  }

  @Get('home')
  getHome(@Req() req: RequestUser) {
    return this.campusService.getHome(req.user);
  }

  @Post('rooms/:roomId/sessions/start')
  startSession(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body() body: StartSessionDto,
  ) {
    return this.campusService.startSession(req.user, roomId, body);
  }

  @Get('sessions/:sessionId/roster')
  getRoster(@Req() req: RequestUser, @Param('sessionId') sessionId: string) {
    return this.campusService.getSessionRoster(req.user, sessionId);
  }

  @Post('sessions/:sessionId/attendance')
  markAttendance(
    @Req() req: RequestUser,
    @Param('sessionId') sessionId: string,
    @Body() body: MarkAttendanceDto,
  ) {
    return this.campusService.markAttendance(req.user, sessionId, body);
  }

  @Post('sessions/:sessionId/end')
  endSession(
    @Req() req: RequestUser,
    @Param('sessionId') sessionId: string,
    @Body() body: EndSessionDto,
  ) {
    return this.campusService.endSession(req.user, sessionId, body);
  }
}
