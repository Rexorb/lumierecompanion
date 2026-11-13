import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { excluirConta } from './user-deletion';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(createUserDto.senha, salt);

    const user = await this.prisma.usuario.create({
      data: {
        ...createUserDto,
        senha: senhaHash,
      },
    });

    const { senha, ...result } = user;
    return result as UserResponseDto;
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.usuario.findMany({
      include: {
        saloes: {
          include: {
            salao: true,
          },
        },
      },
    });

    return users.map(({ senha, ...user }) => user as UserResponseDto);
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        saloes: {
          include: {
            salao: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const { senha, ...result } = user;
    return result as UserResponseDto;
  }

  // 🔧 CORRIGIDO: Retorna UserResponseDto (sem senha)
  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        saloes: {
          include: {
            salao: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const { senha, ...result } = user;
    return result as UserResponseDto;
  }

  // 🔧 CORRIGIDO: Retorna UserResponseDto (sem senha)
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Se senha foi enviada, faz o hash
    if (updateUserDto.senha) {
      const salt = await bcrypt.genSalt(10);
      updateUserDto.senha = await bcrypt.hash(updateUserDto.senha, salt);
    }

    const updatedUser = await this.prisma.usuario.update({
      where: { id },
      data: updateUserDto,
    });

    const { senha, ...result } = updatedUser;
    return result as UserResponseDto;
  }

  /**
   * Exclusão completa da conta em transação (vínculos → cascata dos
   * salões exclusivos → usuário), implementada em `user-deletion.ts` e
   * compartilhada com o CLI de manutenção.
   *
   * Substitui o `usuario.delete` direto, que falhava com P2003 (FK
   * RESTRICT em `usuarios_saloes`) para qualquer usuário com vínculo —
   * ou seja, para todos os usuários reais criados pelo cadastro.
   */
  async remove(id: string): Promise<void> {
    await excluirConta(this.prisma, id);
  }
}
