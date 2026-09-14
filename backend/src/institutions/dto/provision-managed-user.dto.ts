import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class ProvisionManagedUserDto {
  @IsString()
  fullname: string;

  @IsIn(['admin', 'teacher', 'student'])
  role: 'admin' | 'teacher' | 'student';

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  expertise?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  room_ids?: string[];
}
