import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsUUID()
  course_id?: string;
}

export class AssignRoomSubjectDto {
  @IsUUID()
  subject_id: string;

  @IsUUID()
  teacher_id: string;
}
