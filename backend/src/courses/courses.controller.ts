import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { EnrollDto } from './dto/enroll.dto';
import { ReviewDto } from './dto/review.dto';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { LessonNoteDto } from './dto/lesson-note.dto';
import { CourseQuestionDto } from './dto/course-question.dto';
import { QuestionAnswerDto } from './dto/question-answer.dto';
import { ActivitySubmissionDto } from './dto/activity-submission.dto';
import { ActivityReviewDto } from './dto/activity-review.dto';

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
  @Get('teacher/questions')
  getTeacherQuestions(@Req() req: RequestUser) {
    return this.coursesService.getTeacherQuestions(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('learner/certificates')
  getLearnerCertificates(@Req() req: RequestUser) {
    return this.coursesService.getLearnerCertificates(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('learner/activities')
  getLearnerActivities(@Req() req: RequestUser) {
    return this.coursesService.getLearnerActivities(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('learner/activities/:exerciseId/submit')
  submitLearnerActivity(
    @Req() req: RequestUser,
    @Param('exerciseId') exerciseId: string,
    @Body() body: ActivitySubmissionDto,
  ) {
    return this.coursesService.submitLearnerActivity(
      req.user,
      exerciseId,
      body.answer,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('teacher/activities')
  getTeacherActivities(@Req() req: RequestUser) {
    return this.coursesService.getTeacherActivities(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('teacher/insights')
  getTeacherInsights(@Req() req: RequestUser) {
    return this.coursesService.getTeacherInsights(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('trainers/:teacherId')
  getTrainerProfile(@Param('teacherId') teacherId: string) {
    return this.coursesService.getTrainerProfile(teacherId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('teacher/activities/:submissionId')
  reviewTeacherActivity(
    @Req() req: RequestUser,
    @Param('submissionId') submissionId: string,
    @Body() body: ActivityReviewDto,
  ) {
    return this.coursesService.reviewTeacherActivity(
      req.user,
      submissionId,
      body,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('teacher/questions/:questionId')
  answerTeacherQuestion(
    @Req() req: RequestUser,
    @Param('questionId') questionId: string,
    @Body() body: QuestionAnswerDto,
  ) {
    return this.coursesService.answerTeacherQuestion(
      req.user,
      questionId,
      body.answer,
    );
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
  create(@Req() req: RequestUser, @Body() body: CreateCourseDto) {
    return this.coursesService.createCourse(req.user, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':courseId')
  update(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Body() body: CreateCourseDto,
  ) {
    return this.coursesService.updateCourse(req.user, courseId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':courseId')
  remove(@Req() req: RequestUser, @Param('courseId') courseId: string) {
    return this.coursesService.deleteCourse(req.user, courseId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':courseId/enroll')
  enroll(@Req() req: RequestUser, @Body() body: EnrollDto) {
    const courseId = body.courseId?.trim();
    return this.coursesService.enrollInCourse(req.user, courseId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':courseId/reviews')
  addCourseReview(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Body() body: ReviewDto,
  ) {
    return this.coursesService.addCourseReview(req.user, courseId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':courseId/teacher-reviews')
  addTeacherReview(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Body() body: ReviewDto,
  ) {
    return this.coursesService.addTeacherReview(req.user, courseId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':courseId/lessons/:lessonId/progress')
  updateLessonProgress(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: UpdateLessonProgressDto,
  ) {
    return this.coursesService.updateLessonProgress(
      req.user,
      courseId,
      lessonId,
      body,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':courseId/lessons/:lessonId/engagement')
  getLessonEngagement(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.coursesService.getLessonEngagement(
      req.user,
      courseId,
      lessonId,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Put(':courseId/lessons/:lessonId/note')
  saveLessonNote(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: LessonNoteDto,
  ) {
    return this.coursesService.saveLessonNote(
      req.user,
      courseId,
      lessonId,
      body.content,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':courseId/lessons/:lessonId/questions')
  createLessonQuestion(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: CourseQuestionDto,
  ) {
    return this.coursesService.createLessonQuestion(
      req.user,
      courseId,
      lessonId,
      body.body,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':courseId/favorite')
  toggleFavorite(
    @Req() req: RequestUser,
    @Param('courseId') courseId: string,
  ) {
    return this.coursesService.toggleFavorite(req.user, courseId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('upload-thumbnail')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
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
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 250 * 1024 * 1024 } }),
  )
  uploadVideo(@Req() req: RequestUser, @UploadedFile() file?: UploadedAsset) {
    if (!file) {
      throw new BadRequestException('Aucun fichier video recu.');
    }

    return this.coursesService.uploadCourseAsset(req.user, file, 'video');
  }
}
