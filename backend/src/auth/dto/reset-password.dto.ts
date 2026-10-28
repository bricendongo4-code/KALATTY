import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  accessToken: string;

  @IsString()
  @MinLength(1)
  password: string;
}
