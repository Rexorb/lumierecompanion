import { CHATBOT_INITIAL_STATE } from '../chatbot-states';

/** A conversa nasce no menu; opções de Agenda são resolvidas em duas fases. */
export const CHATBOT_STATES = [
  CHATBOT_INITIAL_STATE,
  'ESCOLHER_SERVICO',
  'ESCOLHER_DATA',
  'ESCOLHER_HORARIO',
  'CONFIRMAR_AGENDAMENTO',
  'FINALIZADO',
] as const;

export type ChatbotState = (typeof CHATBOT_STATES)[number];

/** Snapshots guardam identidades exibidas, nunca texto da mensagem ou JID. */
export interface ChatbotContext {
  servicoId?: string;
  servicosExibidos?: readonly string[];
  data?: string;
  datasExibidas?: readonly string[];
  inicioEm?: string;
  horariosExibidos?: readonly string[];
}

/** Nomes são apenas de apresentação; a identidade da seleção é o ID. */
export interface ServiceOption {
  id: string;
  name: string;
}

export interface TimeOption {
  /** Identidade do instante absoluto, não a posição nem o rótulo local. */
  id: string;
  localTime: string;
}

export type ChatbotReply =
  | { kind: 'welcome' }
  | { kind: 'menu' }
  | { kind: 'none' }
  | { kind: 'ask_service'; options: readonly ServiceOption[] }
  | { kind: 'ask_date'; options: readonly string[] }
  | { kind: 'ask_time'; options: readonly TimeOption[] }
  | { kind: 'ask_confirmation' }
  | { kind: 'invalid_option' }
  | { kind: 'invalid_service_option' }
  | { kind: 'invalid_date_option' }
  | { kind: 'invalid_time_option' }
  | { kind: 'invalid_confirmation' }
  | { kind: 'no_services_available' }
  | { kind: 'no_dates_available' }
  | { kind: 'no_times_available' }
  | { kind: 'service_selected' }
  | { kind: 'goodbye' };

/** Efeito declarado; o orquestrador decide como e quando listar serviços. */
export type ChatbotEffect =
  | { kind: 'LIST_SERVICES'; purpose: 'show_options' }
  | { kind: 'LIST_SERVICES'; purpose: 'select_service'; selection: string }
  | {
      kind: 'LIST_DATES';
      purpose: 'show_options' | 'select_date';
      selection?: string;
    }
  | {
      kind: 'LIST_TIMES';
      purpose: 'show_options' | 'select_time';
      selection?: string;
    };

export interface TransitionInput {
  state: ChatbotState;
  context: ChatbotContext;
  input: string;
}

export interface TransitionResult {
  nextState: ChatbotState;
  nextContext: ChatbotContext;
  reply: ChatbotReply;
  effects: readonly ChatbotEffect[];
  action?: 'FINALIZE' | 'SERVICE_SELECTED' | 'CONFIRM_APPOINTMENT';
}

export interface ServiceListResult {
  /** Retorno pendente da primeira transição; não é alterado. */
  pending: TransitionResult;
  /**
   * Resultado de LIST_SERVICES. Para `select_service`, o orquestrador deve
   * fornecer opções atuais para revalidar a identidade guardada no snapshot.
   * A ordem de uma nova consulta nunca redefine o índice mostrado ao cliente.
   */
  services: readonly ServiceOption[];
}

export interface DateListResult {
  pending: TransitionResult;
  /** Datas civis YYYY-MM-DD disponíveis para o serviço do contexto. */
  dates: readonly string[];
}

export interface TimeListResult {
  pending: TransitionResult;
  /** Instantes disponíveis da data civil e serviço do contexto. */
  times: readonly TimeOption[];
}
