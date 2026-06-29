import { IsOptional, IsString } from 'class-validator';

export class CreateLogDto {
  @IsString()
  action: string;

  @IsString()
  admin: string;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  details?: string;
}
