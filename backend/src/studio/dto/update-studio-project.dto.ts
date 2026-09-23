import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateStudioProjectDto {
  @IsInt()
  @Min(1)
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  script?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  transcript?: string;

  @IsOptional()
  @IsArray()
  scenes?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  videoPath?: string;

  @IsOptional()
  @IsIn(['draft', 'ready', 'published', 'archived'])
  status?: 'draft' | 'ready' | 'published' | 'archived';
}
