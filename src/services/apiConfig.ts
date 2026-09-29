// TRUST-CV API Configuration
// In development: uses Vite local proxy ('') -> localhost:8000
// In production: uses VITE_API_URL or defaults to the live Render backend

const DEFAULT_PROD_URL = 'https://trustcvmvp.onrender.com';

export const API_BASE: string = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_API_URL) {
      return (import.meta.env.VITE_API_URL as string).replace(/\/$/, '');
    }
    if (import.meta.env.PROD) {
      return DEFAULT_PROD_URL;
    }
  }
  return '';
})();

export function getApiEndpoint(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

