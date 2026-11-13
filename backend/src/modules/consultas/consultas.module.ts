import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import {
  AgendamentosConsultaController,
  ClientesConsultaController,
} from './consultas.controller';
import { ConsultasService } from './consultas.service';

@Module({
  imports: [PrismaModule],
  controllers: [ClientesConsultaController, AgendamentosConsultaController],
  providers: [ConsultasService],
})
export class ConsultasModule {}
