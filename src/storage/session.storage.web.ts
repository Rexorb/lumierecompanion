// SecureStore não existe no navegador. A versão web é somente prévia visual;
// nunca persistir JWT em localStorage ou em outro armazenamento web.
export const sessionStorage = {
  read: async (): Promise<string | null> => null,
  write: async (_token: string): Promise<void> => { throw new Error('Login disponível apenas no aplicativo mobile.'); },
  clear: async (): Promise<void> => {},
};
