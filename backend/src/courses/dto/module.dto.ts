import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AttachmentDto } from './attachment.dto';
import { ExerciseDto } from './exercise.dto';
import { LessonDto } from './lesson.dto';

export class ModuleDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonDto)
  lessons?: LessonDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseDto)
  exercises?: ExerciseDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  files?: AttachmentDto[];
}
