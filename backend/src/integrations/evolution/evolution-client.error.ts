export type EvolutionErrorCode =
  | 'EVOLUTION_NOT_CONFIGURED'
  | 'EVOLUTION_CONFIGURATION_INVALID'
  | 'EVOLUTION_TIMEOUT'
  | 'EVOLUTION_UNAVAILABLE'
  | 'EVOLUTION_UNAUTHORIZED'
  | 'EVOLUTION_INSTANCE_NOT_FOUND'
  | 'EVOLUTION_REQUEST_REJECTED'
  | 'EVOLUTION_RESPONSE_INVALID';

const MESSAGES: Record<EvolutionErrorCode, string> = {
  EVOLUTION_NOT_CONFIGURED: 'A integração com WhatsApp não está configurada',
  EVOLUTION_CONFIGURATION_INVALID: 'A configuração do WhatsApp é inválida',
  EVOLUTION_TIMEOUT: 'A comunicação com o WhatsApp excedeu o tempo limite',
  EVOLUTION_UNAVAILABLE: 'O serviço de WhatsApp está indisponível',
  EVOLUTION_UNAUTHORIZED: 'A autenticação com o serviço de WhatsApp falhou',
  EVOLUTION_INSTANCE_NOT_FOUND: 'A instância de WhatsApp não foi encontrada',
  EVOLUTION_REQUEST_REJECTED: 'O serviço de WhatsApp rejeitou a operação',
  EVOLUTION_RESPONSE_INVALID: 'O serviço de WhatsApp retornou dados inválidos',
};

export class EvolutionClientError extends Error {
  constructor(readonly code: EvolutionErrorCode) {
    super(MESSAGES[code]);
    this.name = 'EvolutionClientError';
  }
}
