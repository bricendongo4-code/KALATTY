import {
  BadRequestException,
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
import { CoursesService } from './courses.service';

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

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('discover')
  getDiscovery() {
    return this.coursesService.getPublicDiscovery();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('mine')
  getMine(@Req() req: RequestUser) {
    return this.coursesService.getTeacherCourses(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':courseId/edit')
  getCourseForEdit(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
  ) {
    return this.coursesService.getTeacherCourseForEdit(req.user, courseId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':courseId')
  getCourseDetail(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
  ) {
    return this.coursesService.getCourseDetail(req.user, courseId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Req() req: RequestUser,
    @Body()
    body: Record<string, unknown>,
  ) {
    return this.coursesService.createCourse(
      req.user,
      body as Parameters<CoursesService['createCourse']>[1],
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':courseId')
  update(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.coursesService.updateCourse(
      req.user,
      courseId,
      body as Parameters<CoursesService['updateCourse']>[2],
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':courseId/enroll')
  enroll(
    @Req() req: RequestUser,
    @Body() body: { courseId?: string },
  ) {
    const courseId = body.courseId?.trim();
    return this.coursesService.enrollInCourse(req.user, courseId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':courseId/reviews')
  addCourseReview(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Body() body: { rating?: number; comment?: string },
  ) {
    return this.coursesService.addCourseReview(req.user, courseId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':courseId/teacher-reviews')
  addTeacherReview(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Body() body: { rating?: number; comment?: string },
  ) {
    return this.coursesService.addTeacherReview(req.user, courseId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':courseId/lessons/:lessonId/progress')
  updateLessonProgress(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: { status?: 'started' | 'completed' },
  ) {
    return this.coursesService.updateLessonProgress(
      req.user,
      courseId,
      lessonId,
      body,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload-thumbnail')
  @UseInterceptors(FileInterceptor('file'))
  uploadThumbnail(
    @Req() req: RequestUser,
    @UploadedFile() file?: UploadedAsset,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier miniature recu.');
    }

    return this.coursesService.uploadCourseAsset(req.user, file, 'thumbnail');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload-video')
  @UseInterceptors(FileInterceptor('file'))
  uploadVideo(
    @Req() req: RequestUser,
    @UploadedFile() file?: UploadedAsset,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier video recu.');
    }

    return this.coursesService.uploadCourseAsset(req.user, file, 'video');
  }
}
