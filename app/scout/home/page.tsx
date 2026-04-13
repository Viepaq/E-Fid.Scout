import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import ScoutHomeClient from '@/components/scout/ScoutHomeClient';
import type { AgeGroup, ScoutingStatus } from '@/lib/database.types';

type TopDriver = {
  userId: string;
  displayName: string;
  scoreTotal: number;
  ageGroup: AgeGroup | null;
  status: ScoutingStatus;
};

export default async function ScoutHomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const db = createServiceClient();

  const [profileResult, scoresResult, statusesResult] = await Promise.all([
    db.from('profiles').select('id, display_name').eq('id', user.id).single(),
    db
      .from('talent_scores')
      .select('user_id, score_total, age_group, calculated_at')
      .order('calculated_at', { ascending: false }),
    db.from('scouting_status').select('user_id, status'),
  ]);

  const scoutName = (profileResult.data as { display_name: string } | null)?.display_name ?? 'Scout';

  type RawScore = { user_id: string; score_total: number; age_group: AgeGroup | null; calculated_at: string };
  type RawStatus = { user_id: string; status: ScoutingStatus };

  const allScores = (scoresResult.data ?? []) as RawScore[];
  const statuses  = (statusesResult.data ?? []) as RawStatus[];

  // Deduplicate: latest score per user
  const latestByUser = new Map<string, RawScore>();
  for (const s of allScores) {
    if (!latestByUser.has(s.user_id)) latestByUser.set(s.user_id, s);
  }

  const statusMap = new Map(statuses.map((s) => [s.user_id, s.status]));

  // Stats
  const totalDrivers    = latestByUser.size;
  const watchlistCount  = statuses.filter((s) => s.status === 'watchlist').length;
  const talentPoolCount = statuses.filter((s) => s.status === 'talent_pool').length;
  const qualifierCount  = statuses.filter((s) => s.status === 'qualifier_invited').length;

  const scores = Array.from(latestByUser.values()).map((s) => s.score_total);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  // Top 5 drivers for preview — need display_name
  const profilesResult = await db
    .from('profiles')
    .select('id, display_name')
    .in('id', Array.from(latestByUser.keys()));

  type RawProfile = { id: string; display_name: string };
  const profileMap = new Map(
    ((profilesResult.data ?? []) as RawProfile[]).map((p) => [p.id, p.display_name])
  );

  const topDrivers: TopDriver[] = Array.from(latestByUser.entries())
    .filter(([id]) => profileMap.has(id))
    .map(([userId, score]) => ({
      userId,
      displayName: profileMap.get(userId)!,
      scoreTotal:  score.score_total,
      ageGroup:    score.age_group,
      status:      statusMap.get(userId) ?? 'none',
    }))
    .sort((a, b) => b.scoreTotal - a.scoreTotal)
    .slice(0, 5);

  return (
    <ScoutHomeClient
      scoutName={scoutName}
      stats={{ totalDrivers, watchlistCount, talentPoolCount, qualifierCount, avgScore }}
      topDrivers={topDrivers}
    />
  );
}
