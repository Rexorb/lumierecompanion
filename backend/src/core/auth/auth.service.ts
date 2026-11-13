import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CategoriaServico, Prisma, TipoUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { MailService } from './services/mail.service';

function categoryForService(serviceName: string): CategoriaServico {
  const normalized = serviceName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (
    /corte|coloracao|mechas|progressiva|cauterizacao|penteado/.test(normalized)
  )
    return CategoriaServico.CABELO;
  if (/esmaltacao|alongamento|manicure|pedicure|nail/.test(normalized))
    return CategoriaServico.UNHA;
  if (/depilacao|sobrancelha/.test(normalized))
    return CategoriaServico.ESTETICA;
  if (/maquiagem|automaquiagem/.test(normalized))
    return CategoriaServico.MAQUIAGEM;
  if (/limpeza|massagem|facial|corporais/.test(normalized))
    return CategoriaServico.ESTETICA;

  return CategoriaServico.OUTRO;
}

type UserWithSaloes = Prisma.UsuarioGetPayload<{
  include: { saloes: { include: { salao: true } } };
}>;

function withoutPassword(user: UserWithSaloes): Omit<UserWithSaloes, 'senha'> {
  const { senha: removedPassword, ...result } = user;
  void removedPassword;
  return result;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(
    email: string,
    senha: string,
  ): Promise<Omit<UserWithSaloes, 'senha'>> {
    // 🔧 Busca o usuário COMPLETO (incluindo senha) diretamente no Prisma
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
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(senha, user.senha);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return withoutPassword(user);
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.senha);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      nome: user.nome,
      tipo: user.tipo,
    };

    // Atualiza último login via Prisma direto
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { ultimoLogin: new Date() },
    });

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
        verificado: user.verificado,
        saloes: user.saloes || [],
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(registerDto.senha, salt);

    const user = await this.prisma.$transaction(async (transaction) =>
      transaction.usuario.create({
        data: {
          nome: registerDto.nome,
          email: registerDto.email,
          senha: senhaHash,
          saloes: {
            create: {
              papel: TipoUsuario.DONO_SALAO,
              salao: {
                create: {
                  nome: registerDto.salao.nome,
                  cep: registerDto.salao.cep,
                  endereco: registerDto.salao.endereco,
                  numero: registerDto.salao.numero,
                  complemento: registerDto.salao.complemento || null,
                  cidade: registerDto.salao.cidade,
                  servicos: {
                    create: registerDto.salao.servicos.map((nome) => ({
                      nome,
                      duracao: 60,
                      preco: 0,
                      categoria: categoryForService(nome),
                    })),
                  },
                },
              },
            },
          },
        },
        include: {
          saloes: {
            include: { salao: true },
          },
        },
      }),
    );

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      nome: user.nome,
      tipo: user.tipo,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
        verificado: user.verificado,
        saloes: user.saloes,
      },
    };
  }

  async forgotPassword(
    forgotDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const response = {
      message:
        'Se a recuperação estiver disponível e o e-mail estiver cadastrado, você receberá instruções',
    };

    // Sem provedor não criamos token que jamais poderia ser enviado.
    if (!this.mailService.isAvailable()) return response;

    const user = await this.prisma.usuario.findUnique({
      where: { email: forgotDto.email },
    });

    if (!user) return response;

    const token = crypto.randomBytes(16).toString('hex');
    const lifetimeHours =
      Number(process.env.RESET_PASSWORD_LIFETIME_HOURS) || 1;
    const expiresAt = new Date(Date.now() + lifetimeHours * 60 * 60 * 1000);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { tokenReset: token, tokenResetExpira: expiresAt },
    });

    try {
      await this.mailService.sendPasswordResetLink(user.email, token);
    } catch {
      // Erros do provedor podem conter headers ou dados pessoais; não logar.
      this.logger.warn('Falha ao enviar e-mail de recuperação');
      await this.prisma.usuario.updateMany({
        where: { id: user.id, tokenReset: token },
        data: { tokenReset: null, tokenResetExpira: null },
      });
    }

    return response;
  }

  async resetPassword(
    resetDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.usuario.findUnique({
      where: { email: resetDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (user.tokenReset !== resetDto.token) {
      throw new UnauthorizedException('Token inválido');
    }

    if (!user.tokenResetExpira || user.tokenResetExpira < new Date()) {
      throw new UnauthorizedException('Token expirado');
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(resetDto.senha, salt);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { senha: senhaHash, tokenReset: null, tokenResetExpira: null },
    });

    return {
      message: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
    };
  }

  async getUserFromToken(token: string) {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(token);
      const user = await this.prisma.usuario.findUnique({
        where: { id: decoded.sub },
        include: {
          saloes: {
            include: {
              salao: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      return withoutPassword(user);
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
