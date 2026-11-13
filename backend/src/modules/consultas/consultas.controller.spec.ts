import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import {
  AgendamentosConsultaController,
  ClientesConsultaController,
} from './consultas.controller';
import { ConsultasService } from './consultas.service';

describe('Rotas de consulta: guard e DTO HTTP', () => {
  let app: INestApplication;
  const httpServer = () => app.getHttpServer() as Parameters<typeof request>[0];
  const service = { clientes: jest.fn(), agendamentos: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ClientesConsultaController, AgendamentosConsultaController],
      providers: [{ provide: ConsultasService, useValue: service }],
    })
      // Substitui a estratégia JWT por identidade de teste, sem banco nem JWT real.
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => { getRequest: () => { user: { id: string } } };
        }) => {
          context.switchToHttp().getRequest().user = { id: 'user-a' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());

  it('rejeita paginação e filtros inválidos sem consultar dados', async () => {
    await request(httpServer())
      .get('/clientes?salaoId=s&pageSize=1000')
      .expect(400);
    await request(httpServer())
      .get('/agendamentos?salaoId=s&date=ontem')
      .expect(400);
    await request(httpServer())
      .get('/agendamentos?salaoId=s&status=OUTRO')
      .expect(400);
    await request(httpServer()).get('/clientes').expect(400);
    expect(service.clientes).not.toHaveBeenCalled();
    expect(service.agendamentos).not.toHaveBeenCalled();
  });

  it('repassa identidade e filtros validados ao serviço', async () => {
    service.clientes.mockResolvedValue({
      salon: { id: 's', name: 'Salão' },
      items: [],
      page: 2,
      pageSize: 10,
      total: 0,
      hasMore: false,
    });
    await request(httpServer())
      .get('/clientes?salaoId=s&search=Ana&page=2&pageSize=10')
      .expect(200);
    expect(service.clientes).toHaveBeenCalledWith(
      'user-a',
      expect.objectContaining({
        salaoId: 's',
        search: 'Ana',
        page: 2,
        pageSize: 10,
      }),
    );
  });
});
