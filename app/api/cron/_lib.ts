import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { calculateAndSaveScore } from '@/lib/scoring';

export function checkAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export type CronResult = {
  success: boolean;
  processed: number;
  errors: { userId: string; error: string }[];
};

export async function runScoreCalculation(): Promise<CronResult> {
  const supabase = createServiceClient();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id');

  if (error) throw error;

  const errors: { userId: string; error: string }[] = [];

  for (const profile of profiles ?? []) {
    const userId = (profile as { id: string }).id;
    try {
      await calculateAndSaveScore(userId);
      console.log(`[SCORE] ${userId}: success`);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ?? JSON.stringify(err);
      console.error(`[SCORE] ${userId}: failed — ${message}`);
      errors.push({ userId, error: message });
    }
  }

  return {
    success: true,
    processed: (profiles ?? []).length,
    errors,
  };
}
