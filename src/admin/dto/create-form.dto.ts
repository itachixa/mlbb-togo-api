import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateFormDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  fields?: any[];
}
