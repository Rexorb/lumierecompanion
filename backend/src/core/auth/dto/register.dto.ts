import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

class SalaoRegisterDto {
  @IsNotEmpty({ message: 'Nome do salão é obrigatório' })
  @IsString()
  nome: string;

  @IsNotEmpty({ message: 'CEP é obrigatório' })
  @IsString()
  cep: string;

  @IsNotEmpty({ message: 'Endereço é obrigatório' })
  @IsString()
  endereco: string;

  @IsNotEmpty({ message: 'Número é obrigatório' })
  @IsString()
  numero: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsNotEmpty({ message: 'Cidade é obrigatória' })
  @IsString()
  cidade: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Selecione pelo menos um serviço' })
  @IsString({ each: true })
  servicos: string[];
}

export class RegisterDto {
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @IsString()
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @IsNotEmpty({ message: 'Senha é obrigatória' })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  senha: string;

  @ValidateNested()
  @Type(() => SalaoRegisterDto)
  salao: SalaoRegisterDto;
}
