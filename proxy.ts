import { NextResponse, type NextRequest } from 'next/server'

// ─── In-Memory Rate Limiter (Edge-compatible) ─────────────────────────────────
// LRU-lite: stores {count, windowStart} per IP+route key
// This resets on server restart; for persistent limits use Upstash Redis.
const rateLimitStore = new Map<string, { count: number; windowStart: number }>()

// Cleanup entries older than 2 minutes to avoid memory leaks
function cleanupOldEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > 120_000) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Returns true if the request should be blocked (rate limit exceeded).
 * @param ip        - Visitor IP
 * @param route     - Route bucket identifier
 * @param limit     - Max requests per window
 * @param windowMs  - Window duration in ms
 */
function isRateLimited(ip: string, route: string, limit: number, windowMs: number): boolean {
  const key = `${ip}:${route}`
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now })
    return false
  }

  entry.count++
  if (entry.count > limit) {
    return true
  }
  return false
}

// Periodically clean up (not on every request to avoid overhead)
let lastCleanup = Date.now()

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get client IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  // Cleanup stale entries every 60s
  if (Date.now() - lastCleanup > 60_000) {
    cleanupOldEntries()
    lastCleanup = Date.now()
  }

  // ─── Rate Limiting Rules ─────────────────────────────────────────────────────
  // Skip rate limiting on localhost (development)
  const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip === 'unknown' ||
    request.headers.get('host')?.startsWith('localhost')

  if (!isLocalhost) {
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/auth')
    ) {
      // Auth pages — strict: 20 requests per 60s
      if (isRateLimited(ip, 'auth', 20, 60_000)) {
        return new NextResponse('Çok fazla istek. Lütfen bekleyin.', {
          status: 429,
          headers: {
            'Retry-After': '60',
            'Content-Type': 'text/plain; charset=utf-8',
          },
        })
      }
    } else if (pathname.startsWith('/havn-hq-gate')) {
      // HQ gate — very strict: 10 per minute
      if (isRateLimited(ip, 'hq-gate', 10, 60_000)) {
        return new NextResponse('Çok fazla istek. Lütfen bekleyin.', {
          status: 429,
          headers: { 'Retry-After': '60', 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
    } else {
      // General pages — 500 requests per minute per IP
      if (isRateLimited(ip, 'general', 500, 60_000)) {
        return new NextResponse('Çok fazla istek. Lütfen bekleyin.', {
          status: 429,
          headers: { 'Retry-After': '60', 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
    }
  }

  // Clone headers and inject x-pathname for server component layout routing
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // ── 1. /admin → 404 (URL masking) ──────────────────────────────────────────
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.rewrite(new URL('/404-not-found-__havn__', request.url), {
      request: {
        headers: requestHeaders,
      }
    })
  }

  // ── 2. /havn-hq-control Sudo Mode Check ─────────────────────────────────────
  if (pathname.startsWith('/havn-hq-control')) {
    const sudoToken = request.cookies.get('havn_hq_sudo_unlocked')
    if (!sudoToken || sudoToken.value !== 'true') {
      return NextResponse.redirect(new URL('/havn-hq-gate', request.url))
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const middleware = proxy

export default proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
