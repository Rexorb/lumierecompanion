import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardModule } from '../../modules/dashboard/dashboard.module';
import { ConsultasModule } from '../../modules/consultas/consultas.module';
import { AuthModule } from './auth.module';
import { validateJwtConfig } from './jwt-config';

const TEST_SECRET = 'segredo-estritamente-de-teste-para-jwt-comprido-e-unico';

describe('HTTP/JWT e boot sem Resend (Prisma simulado)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const previousSecret = process.env.JWT_SECRET;
  const previousResend = process.env.RESEND_API_KEY;
  const password = 'senha-apenas-para-teste';
  const user = {
    id: 'usuario-teste',
    nome: 'Usuário de teste',
    email: 'conta@exemplo.invalid',
    senha: bcrypt.hashSync(password, 4),
    tipo: 'DONO_SALAO',
    verificado: true,
    saloes: [
      {
        salaoId: 'salao-teste',
        salao: {
          id: 'salao-teste',
          nome: 'Salão teste',
          ativo: true,
          deletedAt: null,
        },
      },
    ],
  };
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    usuarioSalao: { findFirst: jest.fn() },
    cliente: { count: jest.fn(), findMany: jest.fn() },
    agendamento: { count: jest.fn(), findMany: jest.fn() },
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    delete process.env.RESEND_API_KEY;
    const config = await ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      validate: validateJwtConfig,
    });
    const module = await Test.createTestingModule({
      imports: [
        config,
        PrismaModule,
        AuthModule,
        DashboardModule,
        ConsultasModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousResend;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.usuario.findUnique.mockResolvedValue(user);
    prisma.usuario.update.mockResolvedValue(user);
    prisma.usuarioSalao.findFirst.mockResolvedValue({
      salaoId: 'salao-teste',
      salao: {
        id: 'salao-teste',
        nome: 'Salão teste',
        instanciaWhatsApp: null,
      },
    });
    prisma.cliente.count.mockResolvedValue(0);
    prisma.cliente.findMany.mockResolvedValue([]);
    prisma.agendamento.count.mockResolvedValue(0);
    prisma.agendamento.findMany.mockResolvedValue([]);
  });

  const login = async () => {
    const response = await request(app.getHttpServer() as App)
      .post('/auth/login')
      .send({ email: user.email, senha: password })
      .expect(201);
    return (response.body as { access_token: string }).access_token;
  };

  it('sobe sem Resend; login válido, /auth/me, Overview e Consultas funcionam', async () => {
    const token = await login();
    expect(token).toEqual(expect.any(String));
    const profile = await request(app.getHttpServer() as App)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(profile.body).toMatchObject({ id: user.id, nome: user.nome });
    expect(profile.body).not.toHaveProperty('senha');
    await request(app.getHttpServer() as App)
      .get('/dashboard/overview?salaoId=salao-teste')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer() as App)
      .get('/clientes?salaoId=salao-teste')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await request(app.getHttpServer() as App)
      .get('/agendamentos?salaoId=salao-teste&date=2026-11-12')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('senha inválida e acesso sem token retornam 401', async () => {
    await request(app.getHttpServer() as App)
      .post('/auth/login')
      .send({ email: user.email, senha: 'incorreta' })
      .expect(401);
    await request(app.getHttpServer() as App)
      .get('/auth/me')
      .expect(401);
    await request(app.getHttpServer() as App)
      .get('/clientes?salaoId=salao-teste')
      .expect(401);
  });

  it('token expirado e token assinado por outro segredo retornam 401', async () => {
    const expired = jwt.sign({ sub: user.id }, { expiresIn: -1 });
    const invalid = new JwtService({
      secret: 'outro-segredo-usado-somente-no-teste-de-assinatura',
    }).sign({ sub: user.id });
    await request(app.getHttpServer() as App)
      .get('/auth/me')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401);
    await request(app.getHttpServer() as App)
      .get('/auth/me')
      .set('Authorization', `Bearer ${invalid}`)
      .expect(401);
  });

  it('sem Resend a resposta é neutra e não há leitura/escrita de token de recuperação', async () => {
    const response = await request(app.getHttpServer() as App)
      .post('/auth/forgot-password')
      .send({ email: user.email })
      .expect(201);
    expect((response.body as { message: unknown }).message).toEqual(
      expect.any(String),
    );
    expect(JSON.stringify(response.body)).not.toMatch(/enviado com sucesso/i);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
    expect(prisma.usuario.update).not.toHaveBeenCalled();
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
  });
});
