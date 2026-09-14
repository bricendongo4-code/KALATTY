import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateInstitutionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  contact_email?: string;

  @IsOptional()
  @IsString()
  institution_type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  plan_name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_students?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  max_rooms?: number;
}
