import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MobileService } from './mobile.service';

type RequestUser = {
  user: {
    id: string;
    role?: string;
  };
};

@Controller('mobile')
@UseGuards(AuthGuard('jwt'))
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('bootstrap')
  bootstrap(@Req() req: RequestUser) {
    return this.mobileService.getBootstrap(req.user);
  }

  @Get('home')
  home(@Req() req: RequestUser) {
    return this.mobileService.getHome(req.user);
  }
}
