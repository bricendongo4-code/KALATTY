import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(1)
  fullname: string;

  @IsOptional()
  @IsIn(['student', 'teacher', 'institution'])
  role?: 'student' | 'teacher' | 'institution';

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  school_name?: string;

  @IsOptional()
  @IsString()
  expertise?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}
