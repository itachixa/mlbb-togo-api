import { IsOptional, IsString } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  authorId?: string;

  @IsString()
  authorName: string;

  @IsOptional()
  @IsString()
  authorRank?: string;

  @IsString()
  category: string;

  @IsString()
  title: string;

  @IsString()
  content: string;
}
