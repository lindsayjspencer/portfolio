import { NextRequest, NextResponse } from 'next/server';
import { type ThemeName, getThemeNames } from '~/lib/themes';

// Theme decision logic based on request processing
export function determineThemeFromRequest(request: NextRequest): ThemeName | null {
  const url = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer');
  
  // 1. Check for explicit theme in URL params
  const themeParam = url.searchParams.get('theme') as ThemeName;
  if (themeParam && getThemeNames().includes(themeParam)) {
    return themeParam;
  }
  
  // 2. Route-based theme selection
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/dashboard')) {
    return 'corporate';
  }
  
  if (url.pathname.startsWith('/projects')) {
    return 'adventurous';
  }
  
  if (url.pathname.startsWith('/playground') || url.pathname.includes('demo')) {
    return 'exciting';
  }
  
  // 3. User agent analysis
  if (userAgent.includes('Mobile')) {
    return 'vibrant'; // More engaging for mobile
  }
  
  // 4. Referrer-based themes
  if (referer) {
    if (referer.includes('linkedin.com')) {
      return 'corporate';
    }
    if (referer.includes('github.com')) {
      return 'cold';
    }
    if (referer.includes('twitter.com') || referer.includes('x.com')) {
      return 'exciting';
    }
  }
  
  // 5. Time-based themes
  const hour = new Date().getHours();
  if (hour >= 9 && hour <= 17) {
    return 'corporate'; // Business hours
  } else if (hour >= 18 && hour <= 23) {
    return 'vibrant'; // Evening
  }
  
  return null; // No theme change needed
}

// Middleware function to set theme headers
export function setThemeHeaders(response: NextResponse, theme: ThemeName) {
  // Set cookie for persistence
  response.cookies.set('theme', theme, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
  
  // Set header for immediate use
  response.headers.set('x-theme', theme);
  
  return response;
}