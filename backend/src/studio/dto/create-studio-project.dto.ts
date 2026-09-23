import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStudioProjectDto {
  @IsUUID()
  courseId!: string;

  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @IsString()
  @MaxLength(160)
  title!: string;
}
