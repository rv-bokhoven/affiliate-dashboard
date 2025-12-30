import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;
  
  // 1. Check of sessie geldig is
  const verifiedToken = token && (await verifyToken(token));

  // 2. Als niet ingelogd en NIET op login pagina -> Redirect naar login
  if (!verifiedToken && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Als WEL ingelogd en op login pagina -> Redirect naar dashboard
  if (verifiedToken && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};