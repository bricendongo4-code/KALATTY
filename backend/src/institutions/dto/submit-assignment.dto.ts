import { IsOptional, IsString } from 'class-validator';

export class SubmitAssignmentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  file_path?: string;
}
