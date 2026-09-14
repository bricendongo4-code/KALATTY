import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AttendanceRecordDto {
  @IsString()
  student_id: string;

  @IsIn(['present', 'absent', 'late', 'excused'])
  status: 'present' | 'absent' | 'late' | 'excused';

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateAttendanceSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  session_date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records?: AttendanceRecordDto[];
}
