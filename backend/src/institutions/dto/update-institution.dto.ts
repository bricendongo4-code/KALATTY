import { IsOptional, IsString } from 'class-validator';

export class UpdateInstitutionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  contact_email?: string;

  @IsOptional()
  @IsString()
  institution_type?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
