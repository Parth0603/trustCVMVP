// TRUST-CV API Configuration
// Supports local Vite proxy (/api) and deployed cloud backend (VITE_API_URL on Vercel/Netlify)

export const API_BASE: string = (
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
    ? (import.meta.env.VITE_API_URL as string).replace(/\/$/, '')
    : ''
);

export function getApiEndpoint(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
