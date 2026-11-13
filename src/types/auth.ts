export type Salon = { id: string; name: string };
export type AuthUser = { id: string; nome: string; email: string; tipo: string; saloes: Salon[] };

export function parseUser(input: unknown): AuthUser {
  if (!input || typeof input !== 'object') throw new Error('Perfil inválido');
  const user = input as Record<string, unknown>;
  if (typeof user.id !== 'string' || typeof user.nome !== 'string' || typeof user.email !== 'string' || !Array.isArray(user.saloes)) {
    throw new Error('Perfil inválido');
  }
  return {
    id: user.id, nome: user.nome, email: user.email, tipo: typeof user.tipo === 'string' ? user.tipo : '',
    saloes: user.saloes.flatMap((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return [];
      const link = entry as Record<string, unknown>;
      const salon = link.salao as Record<string, unknown> | undefined;
      return salon && typeof salon.id === 'string' && typeof salon.nome === 'string' && salon.ativo === true && salon.deletedAt == null
        ? [{ id: salon.id, name: salon.nome }] : [];
    }),
  };
}
