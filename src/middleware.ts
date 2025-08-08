import { NextRequest, NextResponse } from 'next/server';
import { edgeLogger, generateRequestId } from '@/utils/edgeLogger';

// Simple in-memory rate limiting
const rateLimitStore = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
// More lenient rate limiting for mobile performance
const RATE_LIMIT_MAX_REQUESTS = process.env.NODE_ENV === 'development' ? 100 : 60; // 100 requests per minute in dev, 60 in prod

function getRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(ip, { count: 1, lastReset: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
}

export function middleware(request: NextRequest) {
  // Generate unique request ID for tracking
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining } = getRateLimit(ip);
    
    // Log the incoming request
    edgeLogger.logRequest(request, {
      ip,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    });

    if (!allowed) {
      edgeLogger.warn(`Rate limit exceeded for IP: ${ip}`, { ip, path: request.nextUrl.pathname }, { requestId });
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + RATE_LIMIT_WINDOW / 1000).toString(),
          'X-Request-ID': requestId,
        },
      });
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-Request-ID', requestId);
    
    // Log response (this will be approximate since we can't get the actual response status here)
    const responseTime = Date.now() - startTime;
    edgeLogger.debug(`Middleware processed request`, { responseTime }, { requestId });
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
