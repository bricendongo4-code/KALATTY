import { IsIn, IsString } from 'class-validator';

export class AddRoomMemberDto {
  @IsString()
  user_id: string;

  @IsIn(['teacher', 'student', 'assistant'])
  role: 'teacher' | 'student' | 'assistant';
}
