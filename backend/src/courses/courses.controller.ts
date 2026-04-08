import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CoursesService } from './courses.service';

type RequestUser = {
  user: {
    id: string;
    role?: string;
  };
};

@Controller('courses')
@UseGuards(AuthGuard('jwt'))
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('mine')
  getMine(@Req() req: RequestUser) {
    return this.coursesService.getTeacherCourses(req.user);
  }

  @Post()
  create(
    @Req() req: RequestUser,
    @Body() body: { title: string; description?: string },
  ) {
    return this.coursesService.createCourse(req.user, body);
  }
}
