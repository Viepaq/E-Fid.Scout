import { NextRequest, NextResponse } from 'next/server';
import { checkAuth, runScoreCalculation } from '../_lib';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const authError = checkAuth(request);
  if (authError) return authError;

  try {
    const result = await runScoreCalculation();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SEED-SCORES] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
