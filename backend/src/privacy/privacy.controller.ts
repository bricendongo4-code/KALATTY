import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrivacyRequestDto } from './dto/privacy-request.dto';
import { PrivacyService } from './privacy.service';

type RequestUser = { user: { id: string; email?: string } };

@Controller('privacy')
@UseGuards(AuthGuard('jwt'))
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('export')
  exportMyData(@Req() req: RequestUser) {
    return this.privacyService.exportMyData(req.user);
  }

  @Post('requests')
  createRequest(@Req() req: RequestUser, @Body() body: PrivacyRequestDto) {
    return this.privacyService.createRequest(req.user, body.requestType);
  }
}
