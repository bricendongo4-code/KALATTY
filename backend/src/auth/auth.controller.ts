import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

type RegisterBody = {
  email: string;
  password: string;
  fullname: string;
  role?: 'student' | 'teacher' | 'institution';
  country?: string;
  level?: string;
  school_name?: string;
  expertise?: string;
  bio?: string;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterBody) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }
}
