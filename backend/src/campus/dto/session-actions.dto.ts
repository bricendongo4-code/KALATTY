import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StartSessionDto {
  @IsString()
  room_subject_id: string;
}

export class EndSessionDto {
  @IsOptional()
  @IsString()
  content_done?: string;

  @IsOptional()
  @IsString()
  homework?: string;
}

class AttendanceRecordDto {
  @IsString()
  student_id: string;

  @IsIn(['present', 'absent', 'late', 'excused'])
  status: 'present' | 'absent' | 'late' | 'excused';

  @IsOptional()
  @IsString()
  note?: string;
}

export class MarkAttendanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records: AttendanceRecordDto[];
}
