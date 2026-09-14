import { IsOptional, IsString } from 'class-validator';

export class CourseCheckoutDto {
  @IsOptional()
  @IsString()
  courseId?: string;
}

export class InstitutionCheckoutDto {
  @IsOptional()
  @IsString()
  planName?: string;
}
