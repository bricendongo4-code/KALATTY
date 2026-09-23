import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateLessonProgressDto {
  @IsOptional()
  @IsIn(['started', 'completed'])
  status?: 'started' | 'completed';

  @IsOptional()
  @IsInt()
  @Min(0)
  positionSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPct?: number;
}
