import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { DashboardService } from './dashboard.service';

type UploadedAvatar = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getDashboard(@Req() req: { user: { id: string } }) {
    return this.dashboardService.getDashboard(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  updateProfile(
    @Req() req: { user: { id: string } },
    @Body()
    body: {
      fullname?: string;
      level?: string | null;
      school_name?: string | null;
      expertise?: string | null;
      bio?: string | null;
      avatar_url?: string | null;
    },
  ) {
    return this.dashboardService.updateProfile(req.user.id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadProfileAvatar(
    @Req() req: { user: { id: string } },
    @UploadedFile() file?: UploadedAvatar,
  ) {
    if (!file) {
      throw new BadRequestException('Aucune photo de profil recue.');
    }

    return this.dashboardService.uploadProfileAvatar(req.user.id, file);
  }
}
