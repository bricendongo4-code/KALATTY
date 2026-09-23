import { IsString, MaxLength, MinLength } from 'class-validator';

export class QuestionAnswerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  answer!: string;
}
