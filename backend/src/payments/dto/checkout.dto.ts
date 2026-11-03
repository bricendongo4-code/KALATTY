import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CheckoutDetailsDto {
  @IsOptional() @IsIn(['mobile_money', 'card']) paymentMethod?: string;
  @IsOptional() @IsString() @MaxLength(100) customerName?: string;
  @IsOptional() @IsString() @MaxLength(100) customerSurname?: string;
  @IsOptional() @IsEmail() @MaxLength(150) customerEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) customerPhone?: string;
  @IsOptional() @IsString() @MaxLength(160) customerAddress?: string;
  @IsOptional() @IsString() @MaxLength(80) customerCity?: string;
  @IsOptional() @IsString() @MaxLength(2) customerCountry?: string;
  @IsOptional() @IsString() @MaxLength(20) customerZipCode?: string;
}
export class CourseCheckoutDto extends CheckoutDetailsDto {
  @IsOptional()
  @IsString()
  courseId?: string;
}

export class InstitutionCheckoutDto extends CheckoutDetailsDto {
  @IsOptional()
  @IsString()
  planName?: string;
}
