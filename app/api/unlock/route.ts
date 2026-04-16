import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const entered  = body.password ?? '';
  const expected = process.env.LOCK_PASSWORD ?? '';

  if (!expected) {
    return NextResponse.json({ error: 'Lock not configured' }, { status: 500 });
  }

  // Timing-safe comparison — buffers must be the same length
  let match = false;
  try {
    const a = Buffer.from(entered,  'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length === b.length) {
      match = timingSafeEqual(a, b);
    }
  } catch {
    match = false;
  }

  if (!match) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('site-unlocked', 'true', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
