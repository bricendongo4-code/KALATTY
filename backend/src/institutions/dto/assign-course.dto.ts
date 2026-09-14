import { IsString } from 'class-validator';

export class AssignCourseDto {
  @IsString()
  course_id: string;
}
