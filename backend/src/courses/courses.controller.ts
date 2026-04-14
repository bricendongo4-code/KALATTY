import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
    @Body()
    body: Record<string, unknown>,
  ) {
    return this.coursesService.createCourse(
      req.user,
      body as Parameters<CoursesService['createCourse']>[1],
    );
  }

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
