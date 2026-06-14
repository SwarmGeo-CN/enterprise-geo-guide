import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { discoveryLinkHeader, geoNode } from './lib/synswarm';

export async function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') ?? '';

  if (geoNode.isAICrawler(userAgent)) {
    const rewrite = await geoNode.rewriteForIngestion(request);
    rewrite.headers.set('Link', discoveryLinkHeader());
    return rewrite;
  }

  const response = NextResponse.next();
  response.headers.set('Link', discoveryLinkHeader());
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
