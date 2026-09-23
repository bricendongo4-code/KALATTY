import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class SubmitAbsenceJustificationDto {
  @IsString()
  @Length(10, 1000)
  reason: string;
}

export class ReviewAbsenceJustificationDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @Length(3, 1000)
  note?: string;
}
