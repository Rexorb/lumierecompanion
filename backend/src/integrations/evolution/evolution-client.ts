import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EvolutionClientError } from './evolution-client.error';

export type EvolutionConnectionState =
  'open' | 'connecting' | 'close' | 'unknown';

export interface EvolutionInstance {
  name: string;
  connectionStatus: EvolutionConnectionState;
  number: string | null;
}

export interface EvolutionQrCode {
  count: number;
  base64: string | null;
}

export interface EvolutionSentMessage {
  id: string | null;
  status: string | null;
}

const READ_TIMEOUT_MS = 5_000;
const WRITE_TIMEOUT_MS = 30_000;
const INSTANCE_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new EvolutionClientError('EVOLUTION_RESPONSE_INVALID');
  }
  return value as Record<string, unknown>;
}

function connectionState(value: unknown): EvolutionConnectionState {
  if (typeof value !== 'string') {
    throw new EvolutionClientError('EVOLUTION_RESPONSE_INVALID');
  }
  if (value === 'open' || value === 'connecting' || value === 'close') {
    return value;
  }
  return 'unknown';
}

function instanceName(name: string): string {
  if (typeof name !== 'string' || !INSTANCE_NAME.test(name)) {
    throw new EvolutionClientError('EVOLUTION_REQUEST_REJECTED');
  }
  return encodeURIComponent(name);
}

function isTimeout(error: unknown): boolean {
  if (error === null || typeof error !== 'object' || !('name' in error)) {
    return false;
  }
  const { name } = error;
  return name === 'AbortError' || name === 'TimeoutError';
}

@Injectable()
export class EvolutionClient {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('EVOLUTION_URL')?.trim() &&
      this.config.get<string>('EVOLUTION_API_KEY')?.trim(),
    );
  }

  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<unknown> {
    const baseUrl = this.config.get<string>('EVOLUTION_URL')?.trim();
    const apiKey = this.config.get<string>('EVOLUTION_API_KEY')?.trim();
    if (!baseUrl || !apiKey) {
      throw new EvolutionClientError('EVOLUTION_NOT_CONFIGURED');
    }

    let url: URL;
    try {
      const base = new URL(baseUrl);
      if (
        !['http:', 'https:'].includes(base.protocol) ||
        !base.hostname ||
        base.username ||
        base.password ||
        base.search ||
        base.hash
      ) {
        throw new Error('invalid');
      }
      url = new URL(path, base);
    } catch {
      throw new EvolutionClientError('EVOLUTION_CONFIGURATION_INVALID');
    }

    const signal = AbortSignal.timeout(
      method === 'GET' ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS,
    );
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          apikey: apiKey,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
        redirect: 'error',
      });
    } catch (error) {
      if (signal.aborted || isTimeout(error as unknown)) {
        throw new EvolutionClientError('EVOLUTION_TIMEOUT');
      }
      throw new EvolutionClientError('EVOLUTION_UNAVAILABLE');
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new EvolutionClientError('EVOLUTION_UNAUTHORIZED');
      }
      if (response.status === 404) {
        throw new EvolutionClientError('EVOLUTION_INSTANCE_NOT_FOUND');
      }
      throw new EvolutionClientError(
        response.status >= 500
          ? 'EVOLUTION_UNAVAILABLE'
          : 'EVOLUTION_REQUEST_REJECTED',
      );
    }

    if (response.status === 204) return null;
    try {
      return (await response.json()) as unknown;
    } catch (error) {
      if (signal.aborted || isTimeout(error as unknown)) {
        throw new EvolutionClientError('EVOLUTION_TIMEOUT');
      }
      throw new EvolutionClientError('EVOLUTION_RESPONSE_INVALID');
    }
  }

  async createInstance(name: string): Promise<{
    name: string;
    state: EvolutionConnectionState;
  }> {
    instanceName(name);
    const result = record(
      await this.request('POST', '/instance/create', {
        instanceName: name,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: false,
      }),
    );
    const instance = record(result.instance);
    if (instance.instanceName !== name) {
      throw new EvolutionClientError('EVOLUTION_RESPONSE_INVALID');
    }
    return { name, state: connectionState(instance.status) };
  }

  async connectInstance(name: string): Promise<EvolutionQrCode> {
    const result = record(
      await this.request('GET', `/instance/connect/${instanceName(name)}`),
    );
    if (
      !Number.isInteger(result.count) ||
      (result.count as number) < 0 ||
      (result.base64 != null && typeof result.base64 !== 'string')
    ) {
      throw new EvolutionClientError('EVOLUTION_RESPONSE_INVALID');
    }
    return {
      count: result.count as number,
      base64: (result.base64 as string | undefined) || null,
    };
  }

  async getConnectionState(name: string): Promise<EvolutionConnectionState> {
    const result = record(
      await this.request(
        'GET',
        `/instance/connectionState/${instanceName(name)}`,
      ),
    );
    return connectionState(record(result.instance).state);
  }

  async fetchInstances(name?: string): Promise<EvolutionInstance[]> {
    const query =
      name === undefined ? '' : `?instanceName=${instanceName(name)}`;
    const result = await this.request(
      'GET',
      `/instance/fetchInstances${query}`,
    );
    if (!Array.isArray(result)) {
      throw new EvolutionClientError('EVOLUTION_RESPONSE_INVALID');
    }
    return result.map((entry: unknown) => {
      const instance = record(entry);
      if (typeof instance.name !== 'string') {
        throw new EvolutionClientError('EVOLUTION_RESPONSE_INVALID');
      }
      return {
        name: instance.name,
        connectionStatus: connectionState(instance.connectionStatus),
        number: typeof instance.number === 'string' ? instance.number : null,
      };
    });
  }

  /** Consulta somente a foto da própria conta pareada; JID não sai do adapter. */
  async fetchOwnProfilePicture(name: string): Promise<string | null> {
    const result = await this.request(
      'GET',
      `/instance/fetchInstances?instanceName=${instanceName(name)}`,
    );
    if (!Array.isArray(result) || result.length !== 1) {
      throw new EvolutionClientError('EVOLUTION_RESPONSE_INVALID');
    }
    const instance = record(result[0]);
    if (instance.name !== name || instance.connectionStatus !== 'open') {
      throw new EvolutionClientError('EVOLUTION_RESPONSE_INVALID');
    }
    if (typeof instance.profilePicUrl === 'string' && instance.profilePicUrl) {
      return instance.profilePicUrl;
    }

    const jid = typeof instance.ownerJid === 'string' ? instance.ownerJid : '';
    const number = /^([1-9]\d{9,14})(?::\d+)?@s\.whatsapp\.net$/.exec(jid)?.[1];
    if (!number) return null;

    const profile = record(
      await this.request(
        'POST',
        `/chat/fetchProfilePictureUrl/${instanceName(name)}`,
        { number },
      ),
    );
    if (profile.profilePictureUrl == null) return null;
    if (typeof profile.profilePictureUrl !== 'string') {
      throw new EvolutionClientError('EVOLUTION_RESPONSE_INVALID');
    }
    return profile.profilePictureUrl;
  }

  async sendText(
    name: string,
    number: string,
    text: string,
  ): Promise<EvolutionSentMessage> {
    if (!/^[1-9]\d{9,14}$/.test(number) || !text?.trim()) {
      throw new EvolutionClientError('EVOLUTION_REQUEST_REJECTED');
    }
    const result = record(
      await this.request('POST', `/message/sendText/${instanceName(name)}`, {
        number,
        text,
      }),
    );
    const key = record(result.key);
    return {
      id: typeof key.id === 'string' ? key.id : null,
      status: typeof result.status === 'string' ? result.status : null,
    };
  }

  async disconnectInstance(name: string): Promise<void> {
    await this.request('DELETE', `/instance/logout/${instanceName(name)}`);
  }
}
