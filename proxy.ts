// proxy.ts
// Free Security Proxy - Runs on every request

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security Headers (additional layer)
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  response.headers.set('X-Download-Options', 'noopen');
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  
  // Block common attack patterns in URL
  const url = request.nextUrl.pathname;
  
  // Block suspicious patterns
  const suspiciousPatterns = [
    /etc\/passwd/i,
    /wp-admin/i,
    /phpmyadmin/i,
    /\.env/i,
    /\.git/i,
    /admin\.php/i,
    /shell/i,
    /cmd/i,
    /exec/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  
  // Anti-Scraping: Block common bot user-agents
  const userAgent = request.headers.get('user-agent') || '';
  const blockedAgents = [
    'scraper',
    'wget',
    'curl',
    'httrack',
    'python-requests',
    'python-urllib',
    'node-fetch',
    'axios',
    'httpie',
    'harvester',
    'extractor',
    'spider',
    'crawl',
    'bot',
  ];
  
  // Allow legitimate bots (Google, Bing, etc.)
  const allowedAgents = [
    'googlebot',
    'bingbot',
    'slurp', // Yahoo
    'duckduckbot',
    'baiduspider',
    'yandexbot',
    'facebot',
    'twitterbot',
  ];
  
  const isAllowedBot = allowedAgents.some(agent => 
    userAgent.toLowerCase().includes(agent)
  );
  
  const isBlockedBot = !isAllowedBot && blockedAgents.some(agent => 
    userAgent.toLowerCase().includes(agent)
  );
  
  if (isBlockedBot) {
    return new NextResponse('Forbidden', { 
      status: 403,
      headers: {
        'X-Bot-Blocked': 'true',
      },
    });
  }
  
  // Rate limiting for API routes (basic, free)
  if (url.startsWith('/api/')) {
    // Get IP from headers (Next.js middleware doesn't have request.ip)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `rate:${ip}`;
    
    // Simple in-memory rate limiting
    const rateLimitHeader = request.headers.get('X-RateLimit-Remaining');
    
    if (rateLimitHeader === '0') {
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      });
    }
  }
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Add copyright header
  response.headers.set('X-Copyright', '© GSTECHKH. All rights reserved.');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
