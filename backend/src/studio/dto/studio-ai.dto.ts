import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class StudioAiDto {
  @IsIn(['outline', 'script', 'quiz'])
  action!: 'outline' | 'script' | 'quiz';

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;
}
