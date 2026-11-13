/** Validação única para emissão, verificação e inicialização da API. */
export function requireJwtSecret(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    Buffer.byteLength(value, 'utf8') < 32 ||
    new Set(value).size < 8
  ) {
    throw new Error(
      'JWT_SECRET deve ser configurado com um segredo forte de pelo menos 32 bytes',
    );
  }
  return value;
}

export function validateJwtConfig(config: Record<string, unknown>) {
  return { ...config, JWT_SECRET: requireJwtSecret(config.JWT_SECRET) };
}
