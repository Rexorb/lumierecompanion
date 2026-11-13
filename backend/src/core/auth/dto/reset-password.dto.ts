import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  @IsString()
  email: string;

  @IsNotEmpty({ message: 'Token é obrigatório' })
  @IsString()
  token: string;

  @IsNotEmpty({ message: 'Nova senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  senha: string;
}
