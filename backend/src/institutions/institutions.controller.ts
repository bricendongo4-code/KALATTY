import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InstitutionsService } from './institutions.service';

type RequestUser = {
  user: {
    id: string;
    role?: string;
  };
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
  create(
    @Req() req: RequestUser,
    @Body()
    body: {
      name: string;
      slug?: string;
      contact_email?: string;
      institution_type?: string;
      description?: string;
      country?: string;
      plan_name?: string;
      max_students?: number;
      max_rooms?: number;
    },
  ) {
    return this.institutionsService.createInstitution(req.user, body);
  }

  @Get(':institutionId')
  getDetails(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
  ) {
    return this.institutionsService.getInstitutionDetails(req.user, institutionId);
  }

  @Post(':institutionId/members')
  addMember(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
    @Body()
    body: {
      user_id: string;
      role: 'admin' | 'teacher' | 'student';
    },
  ) {
    return this.institutionsService.addInstitutionMember(req.user, institutionId, body);
  }

  @Post(':institutionId/provision-user')
  provisionManagedUser(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
    @Body()
    body: {
      fullname: string;
      role: 'admin' | 'teacher' | 'student';
      email?: string;
      level?: string;
      expertise?: string;
      bio?: string;
      room_ids?: string[];
    },
  ) {
    return this.institutionsService.provisionManagedUser(req.user, institutionId, body);
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
    @Body()
    body: {
      name: string;
      slug?: string;
      description?: string;
    },
  ) {
    return this.institutionsService.createRoom(req.user, institutionId, body);
  }

  @Get('rooms/:roomId')
  getRoomDetails(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
  ) {
    return this.institutionsService.getRoomDetails(req.user, roomId);
  }

  @Post('rooms/:roomId/members')
  addRoomMember(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body()
    body: {
      user_id: string;
      role: 'teacher' | 'student' | 'assistant';
    },
  ) {
    return this.institutionsService.addRoomMember(req.user, roomId, body);
  }

  @Post('rooms/:roomId/courses')
  assignCourseToRoom(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body()
    body: {
      course_id: string;
    },
  ) {
    return this.institutionsService.assignCourseToRoom(req.user, roomId, body);
  }

  @Post('rooms/:roomId/assignments')
  createAssignment(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body()
    body: {
      course_id?: string;
      lesson_id?: string;
      title: string;
      instructions?: string;
      due_at?: string;
      max_score?: number;
    },
  ) {
    return this.institutionsService.createAssignment(req.user, roomId, body);
  }

  @Post('rooms/:roomId/invites')
  createRoomInvite(
    @Req() req: RequestUser,
    @Param('roomId') roomId: string,
    @Body()
    body: {
      invite_role: 'teacher' | 'student' | 'assistant';
      expires_at?: string;
      max_uses?: number;
    },
  ) {
    return this.institutionsService.createRoomInvite(req.user, roomId, body);
  }

  @Post('invites/:token/redeem')
  redeemInvite(
    @Req() req: RequestUser,
    @Param('token') token: string,
  ) {
    return this.institutionsService.redeemInvite(req.user, token);
  }

  @Patch('submissions/:submissionId/review')
  reviewSubmission(
    @Req() req: RequestUser,
    @Param('submissionId') submissionId: string,
    @Body()
    body: {
      score?: number;
      feedback?: string;
      status?: 'reviewed' | 'returned';
    },
  ) {
    return this.institutionsService.reviewAssignmentSubmission(
      req.user,
      submissionId,
      body,
    );
  }
}
