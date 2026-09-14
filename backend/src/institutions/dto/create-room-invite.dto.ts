import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomInviteDto {
  @IsIn(['teacher', 'student', 'assistant'])
  invite_role: 'teacher' | 'student' | 'assistant';

  @IsOptional()
  @IsString()
  expires_at?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_uses?: number;
}
