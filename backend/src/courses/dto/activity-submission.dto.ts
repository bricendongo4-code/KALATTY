import { IsString, MaxLength, MinLength } from 'class-validator';

export class ActivitySubmissionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20000)
  answer!: string;
}
