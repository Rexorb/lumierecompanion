import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, StatusInstanciaWhatsApp, TipoUsuario } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  EvolutionClient,
  type EvolutionConnectionState,
} from '../../integrations/evolution/evolution-client';
import { EvolutionClientError } from '../../integrations/evolution/evolution-client.error';
import type {
  WhatsappQrDto,
  WhatsappStatusDto,
} from './dto/whatsapp-status.dto';

export type SalonWhatsAppState =
  EvolutionConnectionState | 'not_linked' | 'not_found' | 'unavailable';

export interface SalonWhatsAppConnection {
  salaoId: string;
  state: SalonWhatsAppState;
}

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionClient,
  ) {}

  async getConnectionForUser(
    userId: string,
    requestedSalaoId?: string,
  ): Promise<SalonWhatsAppConnection> {
    if (
      requestedSalaoId !== undefined &&
      (typeof requestedSalaoId !== 'string' || !requestedSalaoId.trim())
    ) {
      throw new ForbiddenException('Você não tem acesso a este salão');
    }

    const membership = await this.prisma.usuarioSalao.findFirst({
      where: {
        usuarioId: userId,
        ...(requestedSalaoId !== undefined
          ? { salaoId: requestedSalaoId }
          : {}),
        salao: { ativo: true, deletedAt: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        salaoId: true,
        salao: {
          select: {
            instanciaWhatsApp: { select: { instanceId: true } },
          },
        },
      },
    });

    if (!membership) {
      if (requestedSalaoId !== undefined) {
        throw new ForbiddenException('Você não tem acesso a este salão');
      }
      throw new NotFoundException(
        'Nenhum salão ativo foi encontrado para este usuário',
      );
    }

    const name = membership.salao.instanciaWhatsApp?.instanceId;
    if (!name) {
      return { salaoId: membership.salaoId, state: 'not_linked' };
    }

    try {
      const state = await this.evolution.getConnectionState(name);
      return { salaoId: membership.salaoId, state };
    } catch (error) {
      if (!(error instanceof EvolutionClientError)) throw error;
      return {
        salaoId: membership.salaoId,
        state:
          error.code === 'EVOLUTION_INSTANCE_NOT_FOUND'
            ? 'not_found'
            : 'unavailable',
      };
    }
  }

  private async getOwnerContext(userId: string, requestedSalaoId?: string) {
    if (
      requestedSalaoId !== undefined &&
      (typeof requestedSalaoId !== 'string' || !requestedSalaoId.trim())
    ) {
      throw new ForbiddenException('Você não tem acesso a este salão');
    }
    const membership = await this.prisma.usuarioSalao.findFirst({
      where: {
        usuarioId: userId,
        ...(requestedSalaoId !== undefined
          ? { salaoId: requestedSalaoId }
          : {}),
        salao: { ativo: true, deletedAt: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        salaoId: true,
        papel: true,
        salao: {
          select: {
            instanciaWhatsApp: {
              select: {
                instanceId: true,
                status: true,
                ultimaConexao: true,
                numero: true,
              },
            },
          },
        },
      },
    });
    if (!membership || membership.papel !== TipoUsuario.DONO_SALAO) {
      throw new ForbiddenException(
        'Você não pode gerenciar o WhatsApp deste salão',
      );
    }
    return membership;
  }

  private providerError(error: EvolutionClientError): HttpException {
    const status =
      error.code === 'EVOLUTION_TIMEOUT'
        ? HttpStatus.GATEWAY_TIMEOUT
        : error.code === 'EVOLUTION_INSTANCE_NOT_FOUND'
          ? HttpStatus.NOT_FOUND
          : error.code === 'EVOLUTION_RESPONSE_INVALID' ||
              error.code === 'EVOLUTION_REQUEST_REJECTED'
            ? HttpStatus.BAD_GATEWAY
            : HttpStatus.SERVICE_UNAVAILABLE;
    return new HttpException(
      { code: error.code, message: error.message },
      status,
    );
  }

  private async fromProvider<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof EvolutionClientError) {
        throw this.providerError(error);
      }
      throw error;
    }
  }

  private requireProvider(): void {
    if (!this.evolution.isConfigured()) {
      throw this.providerError(
        new EvolutionClientError('EVOLUTION_NOT_CONFIGURED'),
      );
    }
  }

  async getStatusForUser(
    userId: string,
    requestedSalaoId?: string,
  ): Promise<WhatsappStatusDto> {
    const connection = await this.getConnectionForUser(
      userId,
      requestedSalaoId,
    );
    const configured = connection.state !== 'not_linked';
    if (!configured) {
      return {
        configured: false,
        status: this.evolution.isConfigured() ? 'DISCONNECTED' : 'UNAVAILABLE',
      };
    }

    const status: WhatsappStatusDto['status'] =
      connection.state === 'open'
        ? 'CONNECTED'
        : connection.state === 'connecting'
          ? 'CONNECTING'
          : connection.state === 'close' || connection.state === 'not_found'
            ? 'DISCONNECTED'
            : 'UNAVAILABLE';
    const result: WhatsappStatusDto = { configured: true, status };
    if (status === 'CONNECTED') {
      const instance = await this.prisma.instanciaWhatsApp.findUnique({
        where: { salaoId: connection.salaoId },
        select: { numero: true, ultimaConexao: true },
      });
      const digits = instance?.numero?.replace(/\D/g, '') ?? '';
      if (digits.length >= 4) result.phoneMasked = `••••${digits.slice(-4)}`;
      if (instance?.ultimaConexao) {
        result.connectedAt = instance.ultimaConexao.toISOString();
      }
    }
    return result;
  }

  async connectForUser(
    userId: string,
    requestedSalaoId?: string,
  ): Promise<WhatsappStatusDto> {
    const membership = await this.getOwnerContext(userId, requestedSalaoId);
    this.requireProvider();
    const existing = membership.salao.instanciaWhatsApp;
    if (existing?.instanceId) {
      const name = existing.instanceId;
      try {
        const state = await this.evolution.getConnectionState(name);
        return {
          configured: true,
          status:
            state === 'open'
              ? 'CONNECTED'
              : state === 'connecting'
                ? 'CONNECTING'
                : state === 'close'
                  ? 'DISCONNECTED'
                  : 'UNAVAILABLE',
        };
      } catch (error) {
        if (
          error instanceof EvolutionClientError &&
          error.code === 'EVOLUTION_INSTANCE_NOT_FOUND' &&
          existing.status === StatusInstanciaWhatsApp.DESCONECTADO &&
          existing.ultimaConexao === null &&
          existing.numero === null
        ) {
          const matches = await this.fromProvider(() =>
            this.evolution.fetchInstances(name),
          );
          if (matches.some((item) => item.name === name)) {
            throw new ConflictException(
              'Instância em recuperação; tente novamente mais tarde',
            );
          }
          await this.fromProvider(() => this.evolution.createInstance(name));
          return { configured: true, status: 'DISCONNECTED' };
        }
        if (error instanceof EvolutionClientError) {
          throw this.providerError(error);
        }
        throw error;
      }
    }
    if (existing) {
      throw new ConflictException(
        'O vínculo WhatsApp deste salão está incompleto',
      );
    }

    // O nome é derivado do salão autenticado; o frontend nunca escolhe a instância.
    const name = `lumiere-${membership.salaoId}`;
    const matches = await this.fromProvider(() =>
      this.evolution.fetchInstances(name),
    );
    if (matches.some((item) => item.name === name)) {
      throw new ConflictException(
        'Instância já existente; solicite verificação',
      );
    }

    // Reserva primeiro o vínculo único. Se a API falhar, uma nova chamada pode
    // retomar a criação com o mesmo nome sem duplicar a instância no banco.
    try {
      await this.prisma.instanciaWhatsApp.create({
        data: {
          salaoId: membership.salaoId,
          nome: 'WhatsApp do salão',
          instanceId: name,
          status: StatusInstanciaWhatsApp.DESCONECTADO,
          webhookEvents: [],
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'O WhatsApp deste salão já está sendo configurado',
        );
      }
      throw error;
    }
    await this.fromProvider(() => this.evolution.createInstance(name));
    return { configured: true, status: 'DISCONNECTED' };
  }

  async getQrForUser(
    userId: string,
    requestedSalaoId?: string,
  ): Promise<WhatsappQrDto> {
    const membership = await this.getOwnerContext(userId, requestedSalaoId);
    this.requireProvider();
    const name = membership.salao.instanciaWhatsApp?.instanceId;
    if (!name)
      throw new NotFoundException(
        'Nenhum WhatsApp configurado para este salão',
      );

    const state = await this.fromProvider(() =>
      this.evolution.getConnectionState(name),
    );
    if (state === 'open') {
      throw new ConflictException(
        'O WhatsApp já está conectado; não é necessário gerar QR',
      );
    }
    if (
      membership.salao.instanciaWhatsApp?.status ===
      StatusInstanciaWhatsApp.CONECTADO
    ) {
      throw new ConflictException(
        'Sessão pareada em reconexão; não gerar QR automaticamente',
      );
    }
    if (state !== 'connecting' && state !== 'close') {
      throw new ServiceUnavailableException('Estado do WhatsApp indisponível');
    }
    return this.fromProvider(() => this.evolution.connectInstance(name));
  }

  async disconnectForUser(
    userId: string,
    requestedSalaoId?: string,
  ): Promise<WhatsappStatusDto> {
    const membership = await this.getOwnerContext(userId, requestedSalaoId);
    this.requireProvider();
    const name = membership.salao.instanciaWhatsApp?.instanceId;
    if (!name)
      throw new NotFoundException(
        'Nenhum WhatsApp configurado para este salão',
      );

    await this.fromProvider(() => this.evolution.disconnectInstance(name));
    await this.prisma.instanciaWhatsApp.update({
      where: { salaoId: membership.salaoId },
      data: {
        status: StatusInstanciaWhatsApp.DESCONECTADO,
        numero: null,
        qrCode: null,
        qrCodeExpira: null,
        ultimaConexao: null,
      },
    });
    return { configured: true, status: 'DISCONNECTED' };
  }
}
