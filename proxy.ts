import { NextResponse, type NextRequest } from 'next/server'

// Lightweight proxy — no Supabase network calls to avoid DNS resolution timeouts in Edge Runtime
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. /admin → 404 (URL masking) ──────────────────────────────────────────
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.rewrite(new URL('/404-not-found-__havn__', request.url))
  }

  // ── 2. /havn-hq-control Sudo Mode Check ─────────────────────────────────────
  // If trying to access control panel, verify they have unlocked the sudo session.
  // We only check the local browser cookie here to keep proxy lightweight.
  if (pathname.startsWith('/havn-hq-control')) {
    const sudoToken = request.cookies.get('havn_hq_sudo_unlocked')
    if (!sudoToken || sudoToken.value !== 'true') {
      return NextResponse.redirect(new URL('/havn-hq-gate', request.url))
    }
  }

  return NextResponse.next()
}

export default proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
