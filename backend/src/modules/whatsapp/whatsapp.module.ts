import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { EvolutionModule } from '../../integrations/evolution/evolution.module';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappProfilePhotoService } from './whatsapp-profile-photo.service';

@Module({
  imports: [PrismaModule, EvolutionModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappProfilePhotoService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
