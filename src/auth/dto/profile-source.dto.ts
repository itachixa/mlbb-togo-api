import { IsIn } from 'class-validator';

export class ProfileSourceDto {
  @IsIn(['google', 'game'])
  source: 'google' | 'game';
}
