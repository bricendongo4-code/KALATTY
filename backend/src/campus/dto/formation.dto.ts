import { IsOptional, IsString } from 'class-validator';

export class CreateFormationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  level?: string;
}

export class CreateFormationRoomDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignRoomFormationDto {
  @IsString()
  formation_id: string;
}
