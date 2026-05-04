// lib/session.ts
// Free Session Security Enhancements

import 'server-only';

export const SESSION_CONFIG = {
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  name: 'somarnix_session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  },
};

/**
 * Generate a secure session ID
 */
export function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if session is expired
 */
export function isSessionExpired(createdAt: number, maxAge: number = SESSION_CONFIG.maxAge): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - createdAt > maxAge;
}

/**
 * Validate session data
 */
export function validateSession(session: unknown): boolean {
  if (!session || typeof session !== 'object') return false;
  
  const sess = session as Record<string, unknown>;
  
  // Check required fields
  if (!sess.userId || !sess.createdAt || !sess.id) {
    return false;
  }
  
  // Check types
  if (typeof sess.userId !== 'number') return false;
  if (typeof sess.createdAt !== 'number') return false;
  if (typeof sess.id !== 'string') return false;
  
  // Check expiration
  if (isSessionExpired(sess.createdAt as number)) {
    return false;
  }
  
  return true;
}

/**
 * Create secure session data
 */
export function createSession(userId: number): { id: string; createdAt: number; userId: number } {
  return {
    id: generateSessionId(),
    createdAt: Math.floor(Date.now() / 1000),
    userId,
  };
}

/**
 * Get session age in days
 */
export function getSessionAge(createdAt: number): number {
  const now = Math.floor(Date.now() / 1000);
  const ageSeconds = now - createdAt;
  return Math.floor(ageSeconds / (24 * 60 * 60));
}
