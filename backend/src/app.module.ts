// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Core
import { PrismaModule } from './core/prisma/prisma.module';
import { UsersModule } from './core/users/users.module';
import { AuthModule } from './core/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { EvolutionModule } from './integrations/evolution/evolution.module';
import { EvolutionWebhookModule } from './modules/webhooks/evolution-webhook.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { ConsultasModule } from './modules/consultas/consultas.module';
import { validateJwtConfig } from './core/auth/jwt-config';

// Modules (serão adicionados depois)
// import { SaloesModule } from './modules/saloes/saloes.module';
// import { ServicosModule } from './modules/servicos/servicos.module';
// import { ClientesModule } from './modules/clientes/clientes.module';
// import { AgendamentosModule } from './modules/agendamentos/agendamentos.module';
// import { HorariosModule } from './modules/horarios/horarios.module';
// (ChatbotModule importado acima — Fase 8.1)

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 👈 Torna o ConfigModule global
      envFilePath: '.env', // 👈 Caminho do arquivo .env
      validate: validateJwtConfig,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    DashboardModule,
    ConsultasModule,
    EvolutionModule,
    WhatsappModule,
    EvolutionWebhookModule,
    ChatbotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
