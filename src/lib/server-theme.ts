import { headers, cookies } from 'next/headers';
import { type ThemeName, getThemeNames } from '~/lib/themes';

// Server-side theme detection utilities

export async function getServerTheme(): Promise<ThemeName> {
  // 1. Check cookies first (user preference)
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme')?.value as ThemeName;
  
  if (themeCookie && getThemeNames().includes(themeCookie)) {
    return themeCookie;
  }
  
  // 2. Check headers for theme hint (e.g., from subdomain, query param, etc.)
  const headersList = await headers();
  const themeHeader = headersList.get('x-theme') as ThemeName;
  
  if (themeHeader && getThemeNames().includes(themeHeader)) {
    return themeHeader;
  }
  
  // 3. Geographic/time-based theme selection
  const geo = headersList.get('x-vercel-ip-country');
  const timeZone = headersList.get('x-vercel-ip-timezone');
  
  if (geo || timeZone) {
    const suggestedTheme = getThemeByContext(geo, timeZone);
    if (suggestedTheme) {
      return suggestedTheme;
    }
  }
  
  // 4. Default fallback
  return 'cold';
}

// Theme selection based on geographic/temporal context
function getThemeByContext(country?: string | null, timeZone?: string | null): ThemeName | null {
  // Corporate theme for business hours
  if (timeZone) {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 9 && hour <= 17) {
      return 'corporate';
    }
  }
  
  // Regional theme preferences (examples)
  if (country) {
    switch (country.toLowerCase()) {
      case 'jp':
      case 'kr':
        return 'elegant';
      case 'br':
      case 'mx':
        return 'vibrant';
      case 'de':
      case 'ch':
        return 'corporate';
      case 'au':
      case 'nz':
        return 'adventurous';
      default:
        return null;
    }
  }
  
  return null;
}

// Set theme cookie (for use in server actions or API routes)
export async function setServerTheme(theme: ThemeName) {
  const cookieStore = await cookies();
  
  cookieStore.set('theme', theme, {
    httpOnly: false, // Allow client-side access
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
}

// Server action for theme switching
export async function changeThemeAction(theme: ThemeName) {
  'use server';
  
  if (!getThemeNames().includes(theme)) {
    throw new Error(`Invalid theme: ${theme}`);
  }
  
  await setServerTheme(theme);
}

// Utility to get theme from URL parameters (for preview modes)
export function getThemeFromSearchParams(searchParams: URLSearchParams): ThemeName | null {
  const themeParam = searchParams.get('theme') as ThemeName;
  
  if (themeParam && getThemeNames().includes(themeParam)) {
    return themeParam;
  }
  
  return null;
}