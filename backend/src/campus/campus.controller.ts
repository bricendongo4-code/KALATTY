import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import {
  AssignRoomFormationDto,
  CreateFormationDto,
  CreateFormationRoomDto,
} from './dto/formation.dto';

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

  @Get('student/overview')
  getStudentOverview(@Req() req: RequestUser) {
    return this.campusService.getStudentOverview(req.user);
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

  @Get('institutions/:institutionId/formations')
  listFormations(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
  ) {
    return this.campusService.listFormations(req.user, institutionId);
  }

  @Post('institutions/:institutionId/formations')
  createFormation(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
    @Body() body: CreateFormationDto,
  ) {
    return this.campusService.createFormation(req.user, institutionId, body);
  }

  @Post('formations/:formationId/rooms')
  createRoomInFormation(
    @Req() req: RequestUser,
    @Param('formationId') formationId: string,
    @Body() body: CreateFormationRoomDto,
  ) {
    return this.campusService.createRoomInFormation(
      req.user,
      formationId,
      body,
    );
  }

  @Patch('rooms/:roomId/formation')
  assignRoomToFormation(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body() body: AssignRoomFormationDto,
  ) {
    return this.campusService.assignRoomToFormation(
      req.user,
      roomId,
      body.formation_id,
    );
  }

  @Get('my-assignments')
  listMyAssignments(@Req() req: RequestUser) {
    return this.campusService.listMyAssignments(req.user);
  }
}
