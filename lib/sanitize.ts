// lib/sanitize.ts
// Free Input Sanitization - Prevents XSS and Injection Attacks

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeInput(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, maxLength); // Limit length
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: unknown): string {
  if (typeof email !== 'string') return '';
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '') // Only allow valid email chars
    .slice(0, 255);
}

/**
 * Sanitize URL input
 */
export function sanitizeUrl(url: unknown): string {
  if (typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // Only allow http/https URLs
  if (!trimmed.match(/^https?:\/\//i)) {
    return '';
  }
  
  return trimmed.slice(0, 2048);
}

/**
 * Sanitize integer input
 */
export function sanitizeInt(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const num = Number(value);
  
  if (!Number.isFinite(num)) return min;
  
  return Math.min(Math.max(num, min), max);
}

/**
 * Sanitize search query
 */
export function sanitizeSearch(query: unknown): string {
  return sanitizeInput(query, 100)
    .replace(/[%_\\]/g, '') // Remove SQL wildcards
    .toLowerCase();
}

/**
 * Validate CSRF token (basic implementation)
 */
export function validateCSRFToken(token: string | null, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  return token === sessionToken;
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2) + 
         Math.random().toString(36).substring(2) +
         Date.now().toString(36);
}

/**
 * Rate limit checker (in-memory, free alternative)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
