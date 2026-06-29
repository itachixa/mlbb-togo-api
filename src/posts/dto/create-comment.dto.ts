import { IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsOptional()
  @IsString()
  authorId?: string;

  @IsString()
  authorName: string;

  @IsString()
  content: string;
}
