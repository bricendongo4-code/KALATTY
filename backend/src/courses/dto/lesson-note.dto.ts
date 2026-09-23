import { IsString, MaxLength } from 'class-validator';

export class LessonNoteDto {
  @IsString()
  @MaxLength(10000)
  content!: string;
}
