import {
  Controller,
  Get,
  Header,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import type {
  WhatsappQrDto,
  WhatsappStatusDto,
} from './dto/whatsapp-status.dto';
import { WhatsappService } from './whatsapp.service';
import { WhatsappProfilePhotoService } from './whatsapp-profile-photo.service';

type AuthenticatedRequest = { user: { id: string } };

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  constructor(
    private readonly whatsapp: WhatsappService,
    private readonly profilePhoto: WhatsappProfilePhotoService,
  ) {}

  @Get('profile-photo')
  @Header('Cache-Control', 'no-store')
  profilePicture(
    @Request() request: AuthenticatedRequest,
    @Query('salaoId') salaoId: string,
  ): Promise<{ url: string | null }> {
    return this.profilePhoto.getForOwner(request.user.id, salaoId);
  }

  @Get('status')
  @Header('Cache-Control', 'no-store')
  status(
    @Request() request: AuthenticatedRequest,
    @Query('salaoId') salaoId?: string,
  ): Promise<WhatsappStatusDto> {
    return this.whatsapp.getStatusForUser(request.user.id, salaoId);
  }

  @Post('connect')
  connect(
    @Request() request: AuthenticatedRequest,
    @Query('salaoId') salaoId?: string,
  ): Promise<WhatsappStatusDto> {
    return this.whatsapp.connectForUser(request.user.id, salaoId);
  }

  @Get('qr')
  @Header('Cache-Control', 'no-store')
  @Header('Pragma', 'no-cache')
  qr(
    @Request() request: AuthenticatedRequest,
    @Query('salaoId') salaoId?: string,
  ): Promise<WhatsappQrDto> {
    return this.whatsapp.getQrForUser(request.user.id, salaoId);
  }

  @Post('disconnect')
  disconnect(
    @Request() request: AuthenticatedRequest,
    @Query('salaoId') salaoId?: string,
  ): Promise<WhatsappStatusDto> {
    return this.whatsapp.disconnectForUser(request.user.id, salaoId);
  }
}
