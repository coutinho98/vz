import axios from 'axios';

// local: '/api' (proxy do vite) · docker/producao: VITE_API_URL aponta direto para a api
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ingressa:token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem('ingressa:token', token);
  else localStorage.removeItem('ingressa:token');
}

export function getStoredToken() {
  return localStorage.getItem('ingressa:token');
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join('; ') : data.message;
    }
    return error.message;
  }
  return 'Erro inesperado';
}

export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
