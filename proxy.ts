import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

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

export default proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
