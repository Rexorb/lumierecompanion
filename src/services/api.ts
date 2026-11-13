import { create, isAxiosError } from 'axios';

const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const api = create({
  baseURL: configuredUrl || undefined,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
});

// Keep the active credential in memory; persistent storage is SecureStore only.
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;
export const setApiToken = (value: string | null) => { token = value; };
export const setUnauthorizedHandler = (handler: (() => void) | null) => { onUnauthorized = handler; };
export const isApiConfigured = () => Boolean(configuredUrl && /^https?:\/\//i.test(configuredUrl));

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error: unknown) => {
  if (isAxiosError(error) && error.response?.status === 401 && token && error.config?.headers?.Authorization === `Bearer ${token}`) {
    onUnauthorized?.();
  }
  return Promise.reject(error);
});
