import { NextResponse, type NextRequest } from 'next/server'

// Lightweight proxy — no Supabase network calls
// Auth checks happen at page level using server.ts (which uses node-fetch)
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Just forward the request — pages handle their own auth
  return NextResponse.next()
}

export default proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
