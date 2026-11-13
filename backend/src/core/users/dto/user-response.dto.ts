import { TipoUsuario } from '@prisma/client';

export class UserResponseDto {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  verificado: boolean;
  ultimoLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  saloes?: any[];
}
