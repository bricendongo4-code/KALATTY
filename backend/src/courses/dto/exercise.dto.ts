import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AttachmentDto } from './attachment.dto';

export class ExerciseDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  correction?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  files?: AttachmentDto[];
}
