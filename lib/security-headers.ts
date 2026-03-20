// lib/security-headers.ts
// Free Security Headers for Next.js

export const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Permitted-Cross-Domain-Policies',
    value: 'none',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

export const contentSecurityPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'https://accounts.google.com', 'https://www.google.com', 'https://www.gstatic.com'],
  'script-src-elem': ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'https://accounts.google.com', 'https://www.google.com', 'https://www.gstatic.com'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com', 'https://www.google.com'],
  'style-src-elem': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com', 'https://www.google.com'],
  'img-src': ["'self'", 'blob:', 'data:', 'https:', 'https://www.google.com', 'https://www.gstatic.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
  'connect-src': ["'self'", 'https:', 'https://accounts.google.com', 'https://www.google.com', 'https://oauth2.googleapis.com'],
  'frame-src': ["'self'", 'https://accounts.google.com', 'https://www.google.com'],
  'frame-ancestors': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'", 'https://accounts.google.com'],
};

export function getCSPString(): string {
  return Object.entries(contentSecurityPolicy)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}
