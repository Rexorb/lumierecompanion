import { CHATBOT_INITIAL_STATE } from '../chatbot-states';
import type {
  DateListResult,
  ServiceListResult,
  TimeListResult,
  TransitionInput,
  TransitionResult,
} from './chatbot-types';

function selectedId(
  selection: string,
  shown: readonly string[] | undefined,
): string | undefined {
  if (!/^[1-9]\d*$/.test(selection) || !Number.isSafeInteger(Number(selection)))
    return undefined;
  return shown?.[Number(selection) - 1];
}

/** Entrada inicial sem estado INICIO ou leitura de configuração. */
export function startChatbot(): TransitionResult {
  return {
    nextState: CHATBOT_INITIAL_STATE,
    nextContext: {},
    reply: { kind: 'welcome' },
    effects: [],
  };
}

/**
 * Primeira fase: decide com base no estado e texto, sem consultar serviços.
 * Somente trim/lowercase; nenhum NLP, relógio, I/O ou mutação.
 */
export function transition({
  state,
  context,
  input,
}: TransitionInput): TransitionResult {
  const normalized = input.trim().toLowerCase();

  // Em QUALQUER estado, menu/reiniciar sempre limpam o contexto.
  // '0' no menu finaliza; fora do menu volta ao menu.
  if (
    normalized === 'menu' ||
    normalized === 'reiniciar' ||
    (normalized === '0' && state !== CHATBOT_INITIAL_STATE)
  ) {
    return {
      nextState: CHATBOT_INITIAL_STATE,
      nextContext: {},
      reply: { kind: 'menu' },
      effects: [],
    };
  }

  if (state === 'FINALIZADO') {
    return {
      nextState: 'FINALIZADO',
      nextContext: { ...context },
      reply: { kind: 'goodbye' },
      effects: [],
      action: 'FINALIZE',
    };
  }

  if (state === CHATBOT_INITIAL_STATE) {
    if (normalized === '0' || normalized === 'sair') {
      return {
        nextState: 'FINALIZADO',
        nextContext: { ...context },
        reply: { kind: 'goodbye' },
        effects: [],
        action: 'FINALIZE',
      };
    }
    if (normalized === '1' || normalized === 'agendar') {
      return {
        nextState: CHATBOT_INITIAL_STATE,
        nextContext: {},
        reply: { kind: 'none' },
        effects: [{ kind: 'LIST_SERVICES', purpose: 'show_options' }],
      };
    }
    return {
      nextState: CHATBOT_INITIAL_STATE,
      nextContext: { ...context },
      reply: { kind: 'invalid_option' },
      effects: [],
    };
  }

  if (state === 'CONFIRMAR_AGENDAMENTO') {
    if (
      (normalized === '1' || normalized === 'confirmar') &&
      context.servicoId &&
      context.data &&
      context.inicioEm
    ) {
      return {
        nextState: state,
        nextContext: { ...context },
        reply: { kind: 'none' },
        effects: [],
        // Declaração apenas: o orquestrador futuro deverá confirmar e lidar
        // com indisponibilidade antes de enviar resposta ou finalizar.
        action: 'CONFIRM_APPOINTMENT',
      };
    }
    return {
      nextState: state,
      nextContext: { ...context },
      reply: { kind: 'invalid_confirmation' },
      effects: [],
    };
  }

  if (state === 'ESCOLHER_DATA' || state === 'ESCOLHER_HORARIO') {
    const shown =
      state === 'ESCOLHER_DATA'
        ? context.datasExibidas
        : context.horariosExibidos;
    const valid = selectedId(normalized, shown);
    if (!valid) {
      return {
        nextState: state,
        nextContext: { ...context },
        reply: {
          kind:
            state === 'ESCOLHER_DATA'
              ? 'invalid_date_option'
              : 'invalid_time_option',
        },
        effects: [],
      };
    }
    return {
      nextState: state,
      nextContext: { ...context },
      reply: { kind: 'none' },
      effects: [
        state === 'ESCOLHER_DATA'
          ? {
              kind: 'LIST_DATES',
              purpose: 'select_date',
              selection: normalized,
            }
          : {
              kind: 'LIST_TIMES',
              purpose: 'select_time',
              selection: normalized,
            },
      ],
    };
  }

  if (!selectedId(normalized, context.servicosExibidos)) {
    return {
      nextState: 'ESCOLHER_SERVICO',
      nextContext: { ...context },
      reply: { kind: 'invalid_service_option' },
      effects: [],
    };
  }
  return {
    nextState: 'ESCOLHER_SERVICO',
    nextContext: { ...context },
    reply: { kind: 'none' },
    effects: [
      {
        kind: 'LIST_SERVICES',
        purpose: 'select_service',
        selection: normalized,
      },
    ],
  };
}

/**
 * Segunda fase: aplica APENAS o resultado declarado de LIST_SERVICES.
 * O orquestrador executa a consulta fora da FSM e fornece sua lista atual.
 */
export function applyServiceList({
  pending,
  services,
}: ServiceListResult): TransitionResult {
  const effect = pending.effects[0];
  if (pending.effects.length !== 1 || effect?.kind !== 'LIST_SERVICES') {
    throw new Error('Resultado sem LIST_SERVICES pendente');
  }

  if (services.length === 0) {
    return {
      nextState: CHATBOT_INITIAL_STATE,
      nextContext: {},
      reply: { kind: 'no_services_available' },
      effects: [],
    };
  }

  if (effect.purpose === 'show_options') {
    return {
      nextState: 'ESCOLHER_SERVICO',
      nextContext: { servicosExibidos: services.map(({ id }) => id) },
      reply: {
        kind: 'ask_service',
        options: services.map(({ id, name }) => ({ id, name })),
      },
      effects: [],
    };
  }

  const id = selectedId(effect.selection, pending.nextContext.servicosExibidos);
  const selected = services.find((service) => service.id === id);
  if (!selected) {
    return {
      nextState: 'ESCOLHER_SERVICO',
      nextContext: { ...pending.nextContext },
      reply: { kind: 'invalid_service_option' },
      effects: [],
    };
  }
  return {
    nextState: 'ESCOLHER_DATA',
    nextContext: { servicoId: selected.id },
    reply: { kind: 'service_selected' },
    effects: [{ kind: 'LIST_DATES', purpose: 'show_options' }],
    action: 'SERVICE_SELECTED',
  };
}

/** Revalida a data civil escolhida contra a lista atual, sem mudar o índice exibido. */
export function applyDateList({
  pending,
  dates,
}: DateListResult): TransitionResult {
  const effect = pending.effects[0];
  if (pending.effects.length !== 1 || effect?.kind !== 'LIST_DATES') {
    throw new Error('Resultado sem LIST_DATES pendente');
  }
  const { servicoId } = pending.nextContext;
  if (!servicoId) throw new Error('Serviço ausente na escolha de data');
  if (dates.length === 0) {
    return {
      nextState: CHATBOT_INITIAL_STATE,
      nextContext: {},
      reply: { kind: 'no_dates_available' },
      effects: [],
    };
  }
  if (effect.purpose === 'show_options') {
    return {
      nextState: 'ESCOLHER_DATA',
      nextContext: { servicoId, datasExibidas: [...dates] },
      reply: { kind: 'ask_date', options: [...dates] },
      effects: [],
    };
  }
  const date = selectedId(
    effect.selection ?? '',
    pending.nextContext.datasExibidas,
  );
  if (!date || !dates.includes(date)) {
    return {
      nextState: 'ESCOLHER_DATA',
      nextContext: { ...pending.nextContext },
      reply: { kind: 'invalid_date_option' },
      effects: [],
    };
  }
  return {
    nextState: 'ESCOLHER_HORARIO',
    nextContext: { servicoId, data: date },
    reply: { kind: 'none' },
    effects: [{ kind: 'LIST_TIMES', purpose: 'show_options' }],
  };
}

/** O índice do horário aponta para o instante absoluto exibido anteriormente. */
export function applyTimeList({
  pending,
  times,
}: TimeListResult): TransitionResult {
  const effect = pending.effects[0];
  if (pending.effects.length !== 1 || effect?.kind !== 'LIST_TIMES') {
    throw new Error('Resultado sem LIST_TIMES pendente');
  }
  const { servicoId, data } = pending.nextContext;
  if (!servicoId || !data)
    throw new Error('Serviço/data ausente na escolha de horário');
  if (times.length === 0) {
    return {
      nextState: 'ESCOLHER_DATA',
      nextContext: { servicoId },
      reply: { kind: 'no_times_available' },
      effects: [{ kind: 'LIST_DATES', purpose: 'show_options' }],
    };
  }
  if (effect.purpose === 'show_options') {
    return {
      nextState: 'ESCOLHER_HORARIO',
      nextContext: {
        servicoId,
        data,
        horariosExibidos: times.map(({ id }) => id),
      },
      reply: {
        kind: 'ask_time',
        options: times.map(({ id, localTime }) => ({ id, localTime })),
      },
      effects: [],
    };
  }
  const instant = selectedId(
    effect.selection ?? '',
    pending.nextContext.horariosExibidos,
  );
  if (!instant || !times.some((time) => time.id === instant)) {
    return {
      nextState: 'ESCOLHER_HORARIO',
      nextContext: { ...pending.nextContext },
      reply: { kind: 'invalid_time_option' },
      effects: [],
    };
  }
  return {
    nextState: 'CONFIRMAR_AGENDAMENTO',
    nextContext: { servicoId, data, inicioEm: instant },
    reply: { kind: 'ask_confirmation' },
    effects: [],
  };
}
