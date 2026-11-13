import { api } from './api';
import { parseUser } from '@/types/auth';

export const authService = {
  async login(email: string, senha: string) {
    const { data } = await api.post<unknown>('/auth/login', { email, senha });
    if (!data || typeof data !== 'object' || !('access_token' in data) || typeof data.access_token !== 'string' || !data.access_token) {
      throw new Error('Resposta de autenticação inválida.');
    }
    return { token: data.access_token, user: parseUser('user' in data ? data.user : null) };
  },
  async me(token: string) {
    const { data } = await api.get<unknown>('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    return parseUser(data);
  },
};
