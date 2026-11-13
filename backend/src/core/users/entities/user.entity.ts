import { TipoUsuario } from '@prisma/client';

export class UserEntity {
  id: string;
  nome: string;
  email: string;
  senha: string;
  tipo: TipoUsuario;
  verificado: boolean;
  ultimoLogin: Date | null;
  tokenReset: string | null;
  tokenResetExpira: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
