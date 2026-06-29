import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name: string;

  @IsString()
  tag: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsInt()
  maxMembers?: number;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsBoolean()
  isRecruiting?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lookingFor?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];
}
