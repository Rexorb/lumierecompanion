import * as SecureStore from 'expo-secure-store';

// SecureStore aceita apenas letras, números, '.', '-' e '_'.
const KEY = 'lumiere-companion.jwt';
export const sessionStorage = {
  read: () => SecureStore.getItemAsync(KEY),
  write: (token: string) => SecureStore.setItemAsync(KEY, token),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
