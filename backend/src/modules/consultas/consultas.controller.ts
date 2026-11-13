import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import {
  AgendamentosListQueryDto,
  ClientesListQueryDto,
} from './consultas.dto';
import { ConsultasService } from './consultas.service';

type AuthenticatedRequest = { user: { id: string } };

@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesConsultaController {
  constructor(private readonly consultas: ConsultasService) {}

  @Get()
  list(
    @Request() request: AuthenticatedRequest,
    @Query() query: ClientesListQueryDto,
  ) {
    return this.consultas.clientes(request.user.id, query);
  }
}

@Controller('agendamentos')
@UseGuards(JwtAuthGuard)
export class AgendamentosConsultaController {
  constructor(private readonly consultas: ConsultasService) {}

  @Get()
  list(
    @Request() request: AuthenticatedRequest,
    @Query() query: AgendamentosListQueryDto,
  ) {
    return this.consultas.agendamentos(request.user.id, query);
  }
}
