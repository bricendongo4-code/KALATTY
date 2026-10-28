import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  tokenHash: string;

  @IsString()
  @MinLength(1)
  password: string;
}
