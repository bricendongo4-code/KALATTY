import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ActivityReviewDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsString()
  @MaxLength(5000)
  feedback!: string;
}
