import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateScheduleItemDto {
  @IsString()
  title: string;

  @IsInt()
  @Min(1)
  @Max(7)
  weekday: number;

  @IsString()
  starts_at: string;

  @IsOptional()
  @IsString()
  ends_at?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateScheduleItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  weekday?: number;

  @IsOptional()
  @IsString()
  starts_at?: string;

  @IsOptional()
  @IsString()
  ends_at?: string | null;

  @IsOptional()
  @IsString()
  location?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
