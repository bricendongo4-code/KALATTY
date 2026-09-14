import { IsOptional, IsString } from 'class-validator';

export class EnrollDto {
  @IsOptional()
  @IsString()
  courseId?: string;
}
