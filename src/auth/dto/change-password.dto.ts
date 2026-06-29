import { IsEmail, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'Le nouveau mot de passe doit faire au moins 6 caractères.' })
  newPassword: string;
}
