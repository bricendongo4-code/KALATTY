import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class LessonDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  video_path?: string;

  @IsOptional()
  @IsNumber()
  duration_seconds?: number;

  @IsOptional()
  @IsBoolean()
  is_preview?: boolean;
}
