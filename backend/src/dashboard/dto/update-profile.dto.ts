import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullname?: string;

  @IsOptional()
  @IsString()
  level?: string | null;

  @IsOptional()
  @IsString()
  school_name?: string | null;

  @IsOptional()
  @IsString()
  expertise?: string | null;

  @IsOptional()
  @IsString()
  bio?: string | null;

  @IsOptional()
  @IsString()
  avatar_url?: string | null;
}
