import { isAxiosError } from 'axios';

export function authErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    if (!error.response) return 'Não foi possível acessar a API. Confira sua conexão e o endereço configurado.';
    if (error.response.status === 401) return 'E-mail ou senha inválidos, ou sessão expirada.';
    return 'Não foi possível concluir a autenticação. Tente novamente.';
  }
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado.';
}
