import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getThemeNames } from '~/lib/themes';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const theme = cookieStore.get('theme')?.value;
    
    if (theme && getThemeNames().includes(theme as any)) {
      return NextResponse.json({ theme });
    }
    
    return NextResponse.json({ theme: 'cold' }); // default
  } catch (error) {
    return NextResponse.json({ theme: 'cold' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { theme } = await request.json();
    
    if (!theme || !getThemeNames().includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
    }
    
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('theme', theme, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to set theme' }, { status: 500 });
  }
}