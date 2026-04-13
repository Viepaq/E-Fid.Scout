import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { TalentScore, ScoutingStatusRow } from '@/lib/database.types';
import GetStartedClient from '@/components/dashboard/GetStartedClient';

export default async function GetStartedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const db = createServiceClient();

  const [profileResult, scoresResult, statusResult] = await Promise.all([
    db
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single(),
    db
      .from('talent_scores')
      .select('score_total, score_learning_rate, score_consistency, score_racecraft, score_versatility, score_activity')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('scouting_status')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const displayName = (profileResult.data?.display_name ?? 'Driver') as string;
  const score = scoresResult.data as Pick<
    TalentScore,
    'score_total' | 'score_learning_rate' | 'score_consistency' | 'score_racecraft' | 'score_versatility' | 'score_activity'
  > | null;
  const scoutingStatus = (statusResult.data as Pick<ScoutingStatusRow, 'status'> | null)?.status ?? 'none';

  return (
    <GetStartedClient
      displayName={displayName}
      score={score}
      scoutingStatus={scoutingStatus}
    />
  );
}
