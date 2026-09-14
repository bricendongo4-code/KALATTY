import { IsOptional, IsString } from 'class-validator';

export class AttachmentDto {
  @IsString()
  name: string;

  @IsString()
  file_path: string;

  @IsOptional()
  @IsString()
  file_type?: string;
}
