import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class ReviewSubmissionDto {
  @IsOptional()
  @IsNumber()
  score?: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsIn(['reviewed', 'returned'])
  status?: 'reviewed' | 'returned';
}
