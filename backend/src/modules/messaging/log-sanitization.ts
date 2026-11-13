// src/modules/messaging/log-sanitization.ts
// Utilitário local de hashing determinístico para logs sanitizados.
// sha256 SEM salt aleatório para permitir correlação operacional entre
// eventos inbound/outbound. Nunca registrar o valor original nos logs.

import { createHash } from 'node:crypto';

/** Hash truncado e determinístico de um valor para uso exclusivo em logs. */
export function logHash(value: string, length = 10): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length);
}
