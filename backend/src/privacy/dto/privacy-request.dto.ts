import { IsIn } from 'class-validator';

export class PrivacyRequestDto {
  @IsIn(['deletion', 'rectification'])
  requestType!: 'deletion' | 'rectification';
}
