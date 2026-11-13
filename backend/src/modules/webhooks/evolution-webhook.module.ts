import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { MessagingModule } from '../../modules/messaging/messaging.module';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { EvolutionWebhookGuard } from './evolution-webhook.guard';

@Module({
  imports: [PrismaModule, JwtModule.register({}), MessagingModule],
  controllers: [EvolutionWebhookController],
  providers: [EvolutionWebhookGuard],
})
export class EvolutionWebhookModule {}
