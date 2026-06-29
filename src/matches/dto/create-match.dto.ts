import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMatchDto {
  @IsObject()
  team1: any;

  @IsObject()
  team2: any;

  @IsOptional()
  @IsString()
  tournament?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  mvp?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsArray()
  games?: any[];
}
