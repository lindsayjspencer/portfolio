import { NextRequest, NextResponse } from 'next/server';
import { determineThemeFromRequest, setThemeHeaders } from '~/lib/theme-middleware';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Determine if theme should change based on request
  const suggestedTheme = determineThemeFromRequest(request);
  
  if (suggestedTheme) {
    // Set theme in cookie and headers for server-side detection
    setThemeHeaders(response, suggestedTheme);
  }
  
  return response;
}

// Configure which routes trigger middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};