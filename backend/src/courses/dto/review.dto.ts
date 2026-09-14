import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ReviewDto {
  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
