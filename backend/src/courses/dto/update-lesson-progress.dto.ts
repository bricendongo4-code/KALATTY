import { IsIn, IsOptional } from 'class-validator';

export class UpdateLessonProgressDto {
  @IsOptional()
  @IsIn(['started', 'completed'])
  status?: 'started' | 'completed';
}
