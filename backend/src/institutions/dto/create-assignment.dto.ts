import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsOptional()
  @IsString()
  course_id?: string;

  @IsOptional()
  @IsString()
  lesson_id?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsString()
  due_at?: string;

  @IsOptional()
  @IsInt()
  max_score?: number;

  @IsOptional()
  @IsString()
  attachment_path?: string;

  @IsOptional()
  @IsString()
  attachment_name?: string;

  @IsOptional()
  @IsString()
  attachment_type?: string;
}
