import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/** Server-side sign-out so auth cookies are cleared (client signOut alone is unreliable with SSR). */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  await supabase.auth.signOut();
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}
