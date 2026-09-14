import { IsIn, IsOptional, IsString } from 'class-validator';

export class SetRoomMemberStatusDto {
  @IsIn(['active', 'blocked'])
  status: 'active' | 'blocked';

  @IsOptional()
  @IsString()
  reason?: string;
}
