import { IsIn, IsString } from 'class-validator';

export class AddMemberDto {
  @IsString()
  user_id: string;

  @IsIn(['admin', 'teacher', 'student'])
  role: 'admin' | 'teacher' | 'student';
}
