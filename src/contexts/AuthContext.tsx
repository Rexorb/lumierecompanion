import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { setApiToken, setUnauthorizedHandler } from '@/services/api';
import { sessionStorage } from '@/storage/session.storage';
import type { AuthUser } from '@/types/auth';
import { isAxiosError } from 'axios';

type Session = { user: AuthUser; token: string };
type AuthContextValue = {
  user: AuthUser | null; ready: boolean; salonId: string | null;
  selectSalon: (id: string) => void;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const generation = useRef(0);
  const queryClient = useQueryClient();
  const logout = useCallback(async () => {
    ++generation.current;
    setApiToken(null);
    setSession(null);
    setSalonId(null);
    queryClient.clear();
    await sessionStorage.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => { void logout(); });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    const current = generation.current;
    (async () => {
      try {
        const stored = await sessionStorage.read();
        if (!stored || generation.current !== current) return;
        const user = await authService.me(stored);
        if (generation.current !== current) return;
        setApiToken(stored);
        setSession({ token: stored, user });
        setSalonId(user.saloes[0]?.id ?? null);
      } catch (error) {
        // Network failure does not invalidate a stored token; keep it for the next launch.
        // Never grant access without successful server validation.
        if (generation.current === current && (isAxiosError(error) ? error.response?.status === 401 : true)) await logout();
      } finally { setReady(true); }
    })();
  }, [logout]);

  const login = useCallback(async (email: string, senha: string) => {
    const current = generation.current;
    const result = await authService.login(email, senha);
    if (generation.current !== current) return;
    await sessionStorage.write(result.token);
    if (generation.current !== current) { await sessionStorage.clear(); return; }
    queryClient.clear();
    setApiToken(result.token);
    setSession(result);
    setSalonId(result.user.saloes[0]?.id ?? null);
  }, [queryClient]);

  const selectSalon = useCallback((id: string) => {
    if (!session?.user.saloes.some((salon) => salon.id === id)) return;
    queryClient.clear();
    setSalonId(id);
  }, [session, queryClient]);

  return <AuthContext.Provider value={{ user: session?.user ?? null, ready, salonId, selectSalon, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth requer AuthProvider');
  return context;
}
