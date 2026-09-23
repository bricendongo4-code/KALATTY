import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
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

import {
  ReviewAbsenceJustificationDto,
  SubmitAbsenceJustificationDto,
} from './dto/absence-justification.dto';

type UploadedCampusFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

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

  @Get('student/announcements')
  getStudentAnnouncements(@Req() req: RequestUser) {
    return this.campusService.getStudentAnnouncements(req.user);
  }

  @Get('student/attendance')
  getStudentAttendance(@Req() req: RequestUser) {
    return this.campusService.getStudentAttendance(req.user);
  }

  @Post('student/attendance/:recordId/justification')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  submitAbsenceJustification(
    @Req() req: RequestUser,
    @Param('recordId') recordId: string,
    @UploadedFile() file: UploadedCampusFile | undefined,
    @Body() body: SubmitAbsenceJustificationDto,
  ) {
    return this.campusService.submitAbsenceJustification(
      req.user,
      recordId,
      body,
      file,
    );
  }

  @Get('teacher/schedule')
  getTeacherSchedule(@Req() req: RequestUser) {
    return this.campusService.getTeacherSchedule(req.user);
  }

  @Get('staff/schedule')
  getStaffSchedule(@Req() req: RequestUser) {
    return this.campusService.getStaffSchedule(req.user);
  }

  @Get('announcements')
  getAnnouncements(@Req() req: RequestUser) {
    return this.campusService.getAnnouncements(req.user);
  }

  @Post('announcements')
  createAnnouncement(@Req() req: RequestUser, @Body() body: { title?: string; body?: string; audience?: string; roomId?: string }) {
    return this.campusService.createAnnouncement(req.user, body);
  }

  @Get('documents')
  getDocuments(@Req() req: RequestUser) {
    return this.campusService.getDocuments(req.user);
  }

  @Get('staff/assignments')
  getStaffAssignments(@Req() req: RequestUser) {
    return this.campusService.getStaffAssignments(req.user);
  }

  @Get('staff/justifications')
  getJustifications(@Req() req: RequestUser) {
    return this.campusService.getJustifications(req.user);
  }

  @Patch('staff/justifications/:id')
  reviewJustification(
    @Req() req: RequestUser,
    @Param('id') id: string,
    @Body() body: ReviewAbsenceJustificationDto,
  ) {
    return this.campusService.reviewJustification(req.user, id, body);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadDocument(@Req() req: RequestUser, @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string; size: number }, @Body() body: { title?: string; category?: string }) {
    return this.campusService.uploadDocument(req.user, file, body);
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
