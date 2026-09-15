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
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { ProvisionManagedUserDto } from './dto/provision-managed-user.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { AddRoomMemberDto } from './dto/add-room-member.dto';
import { AssignCourseDto } from './dto/assign-course.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import {
  CreateScheduleItemDto,
  UpdateScheduleItemDto,
} from './dto/schedule-item.dto';
import { CreateAttendanceSessionDto } from './dto/create-attendance-session.dto';
import { SetRoomMemberStatusDto } from './dto/set-room-member-status.dto';
import { CreateRoomInviteDto } from './dto/create-room-invite.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';

type RequestUser = {
  user: {
    id: string;
    role?: string;
  };
};

type UploadedAsset = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Controller('institutions')
@UseGuards(AuthGuard('jwt'))
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  @Get('mine')
  getMine(@Req() req: RequestUser) {
    return this.institutionsService.getMyInstitutions(req.user);
  }

  @Post()
  create(@Req() req: RequestUser, @Body() body: CreateInstitutionDto) {
    return this.institutionsService.createInstitution(req.user, body);
  }

  @Get(':institutionId')
  getDetails(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
  ) {
    return this.institutionsService.getInstitutionDetails(
      req.user,
      institutionId,
    );
  }

  @Post(':institutionId/members')
  addMember(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
    @Body() body: AddMemberDto,
  ) {
    return this.institutionsService.addInstitutionMember(
      req.user,
      institutionId,
      body,
    );
  }

  @Post(':institutionId/provision-user')
  provisionManagedUser(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
    @Body() body: ProvisionManagedUserDto,
  ) {
    return this.institutionsService.provisionManagedUser(
      req.user,
      institutionId,
      body,
    );
  }

  @Post(':institutionId/managed-users/:managedUserId/reset-password')
  resetManagedUserPassword(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
    @Param('managedUserId') managedUserId: string,
  ) {
    return this.institutionsService.resetManagedUserPassword(
      req.user,
      institutionId,
      managedUserId,
    );
  }

  @Post(':institutionId/rooms')
  createRoom(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
    @Body() body: CreateRoomDto,
  ) {
    return this.institutionsService.createRoom(req.user, institutionId, body);
  }

  @Get('rooms/:roomId')
  getRoomDetails(@Req() req: RequestUser, @Param('roomId') roomId: string) {
    return this.institutionsService.getRoomDetails(req.user, roomId);
  }

  @Post('rooms/:roomId/members')
  addRoomMember(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body() body: AddRoomMemberDto,
  ) {
    return this.institutionsService.addRoomMember(req.user, roomId, body);
  }

  @Post('rooms/:roomId/courses')
  assignCourseToRoom(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body() body: AssignCourseDto,
  ) {
    return this.institutionsService.assignCourseToRoom(req.user, roomId, body);
  }

  @Post('rooms/:roomId/assignments')
  createAssignment(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body() body: CreateAssignmentDto,
  ) {
    return this.institutionsService.createAssignment(req.user, roomId, body);
  }

  @Post('rooms/:roomId/assignment-files')
  @UseInterceptors(FileInterceptor('file'))
  uploadAssignmentFile(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @UploadedFile() file: UploadedAsset,
  ) {
    return this.institutionsService.uploadAssignmentFile(
      req.user,
      roomId,
      file,
    );
  }

  @Post('rooms/:roomId/schedule')
  createScheduleItem(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body() body: CreateScheduleItemDto,
  ) {
    return this.institutionsService.createScheduleItem(req.user, roomId, body);
  }

  @Patch('schedule/:scheduleItemId')
  updateScheduleItem(
    @Req() req: RequestUser,
    @Param('scheduleItemId') scheduleItemId: string,
    @Body() body: UpdateScheduleItemDto,
  ) {
    return this.institutionsService.updateScheduleItem(
      req.user,
      scheduleItemId,
      body,
    );
  }

  @Post('rooms/:roomId/attendance')
  createAttendanceSession(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body() body: CreateAttendanceSessionDto,
  ) {
    return this.institutionsService.createAttendanceSession(
      req.user,
      roomId,
      body,
    );
  }

  @Post('rooms/:roomId/attendance/check-in')
  checkInAttendance(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
  ) {
    return this.institutionsService.checkInAttendance(req.user, roomId);
  }

  @Patch('rooms/:roomId/members/:memberUserId/status')
  setRoomMemberStatus(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Param('memberUserId') memberUserId: string,
    @Body() body: SetRoomMemberStatusDto,
  ) {
    return this.institutionsService.setRoomMemberStatus(
      req.user,
      roomId,
      memberUserId,
      body,
    );
  }

  @Post('rooms/:roomId/invites')
  createRoomInvite(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body() body: CreateRoomInviteDto,
  ) {
    return this.institutionsService.createRoomInvite(req.user, roomId, body);
  }

  @Post('invites/:token/redeem')
  redeemInvite(@Req() req: RequestUser, @Param('token') token: string) {
    return this.institutionsService.redeemInvite(req.user, token);
  }

  @Patch('submissions/:submissionId/review')
  reviewSubmission(
    @Req() req: RequestUser,
    @Param('submissionId') submissionId: string,
    @Body() body: ReviewSubmissionDto,
  ) {
    return this.institutionsService.reviewAssignmentSubmission(
      req.user,
      submissionId,
      body,
    );
  }
}
