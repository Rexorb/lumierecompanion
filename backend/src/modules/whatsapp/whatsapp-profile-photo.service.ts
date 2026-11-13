import { ForbiddenException, Injectable } from '@nestjs/common';
import { TipoUsuario } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EvolutionClient } from '../../integrations/evolution/evolution-client';
import { EvolutionClientError } from '../../integrations/evolution/evolution-client.error';

function trustedPictureUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'pps.whatsapp.net' &&
      !url.username &&
      !url.password &&
      !url.port
      ? url.href
      : null;
  } catch {
    return null;
  }
}

@Injectable()
export class WhatsappProfilePhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionClient,
  ) {}

  async getForOwner(
    userId: string,
    salaoId: string,
  ): Promise<{ url: string | null }> {
    if (typeof salaoId !== 'string' || !salaoId.trim()) {
      throw new ForbiddenException('Você não tem acesso a este salão');
    }
    const membership = await this.prisma.usuarioSalao.findFirst({
      where: {
        usuarioId: userId,
        salaoId,
        papel: TipoUsuario.DONO_SALAO,
        salao: { ativo: true, deletedAt: null },
      },
      select: {
        salao: {
          select: {
            instanciaWhatsApp: { select: { instanceId: true } },
          },
        },
      },
    });
    if (!membership) {
      throw new ForbiddenException('Você não tem acesso a este salão');
    }
    const name = membership.salao.instanciaWhatsApp?.instanceId;
    if (!name || !this.evolution.isConfigured()) return { url: null };

    try {
      if ((await this.evolution.getConnectionState(name)) !== 'open') {
        return { url: null };
      }
      return {
        url: trustedPictureUrl(
          await this.evolution.fetchOwnProfilePicture(name),
        ),
      };
    } catch (error) {
      // Foto é opcional: falhas do provedor não impedem o uso do painel.
      if (error instanceof EvolutionClientError) return { url: null };
      throw error;
    }
  }
}
