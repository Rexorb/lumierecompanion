const SALON_TIMEZONE = 'America/Sao_Paulo'; // Contrato atual do dashboard/agenda do NestJS.

export function todayAtSalon() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: SALON_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (kind: string) => parts.find((item) => item.type === kind)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function shiftDate(date: string, days: number) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function formatSalonDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

export function formatSalonTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}
