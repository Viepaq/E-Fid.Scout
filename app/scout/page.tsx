import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import FilterBar from '@/components/scout/FilterBar';
import DriverTable from '@/components/scout/DriverTable';
import type { DriverRow } from '@/components/scout/DriverTable';
import type { AgeGroup, ScoutingStatus } from '@/lib/database.types';

type RawScore = {
  user_id: string;
  score_total: number;
  score_learning_rate: number;
  age_group: AgeGroup | null;
  age_group_percentile: number | null;
  calculated_at: string;
};

type RawProfile = {
  id: string;
  display_name: string;
  birth_date: string;
};

type RawStatus = {
  user_id: string;
  status: ScoutingStatus;
};

export default async function ScoutPage({
  searchParams,
}: {
  searchParams: { filter?: string; ageGroup?: string; minScore?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const db = createServiceClient();

  // Load all relevant data in parallel
  const [statusesResult, scoresResult, profilesResult] = await Promise.all([
    db
      .from('scouting_status')
      .select('user_id, status')
      .in('status', ['watchlist', 'talent_pool']),
    db
      .from('talent_scores')
      .select('user_id, score_total, score_learning_rate, age_group, age_group_percentile, calculated_at')
      .order('calculated_at', { ascending: false }),
    db.from('profiles').select('id, display_name, birth_date'),
  ]);

  const statuses = (statusesResult.data ?? []) as RawStatus[];
  const allScores = (scoresResult.data ?? []) as RawScore[];
  const profiles = (profilesResult.data ?? []) as RawProfile[];

  // Build lookup maps
  const statusMap = new Map(statuses.map((s) => [s.user_id, s.status]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Deduplicate scores: latest + previous per user
  const latestByUser = new Map<string, RawScore>();
  const previousByUser = new Map<string, RawScore>();

  for (const score of allScores) {
    if (!latestByUser.has(score.user_id)) {
      latestByUser.set(score.user_id, score);
    } else if (!previousByUser.has(score.user_id)) {
      previousByUser.set(score.user_id, score);
    }
  }

  // Build rows — only users with watchlist or talent_pool status
  const relevantUserIds = new Set(statuses.map((s) => s.user_id));

  const rows: DriverRow[] = Array.from(relevantUserIds)
    .filter((id) => latestByUser.has(id) && profileMap.has(id))
    .map((userId) => {
      const score = latestByUser.get(userId)!;
      const profile = profileMap.get(userId)!;
      const prev = previousByUser.get(userId) ?? null;
      return {
        userId,
        displayName: profile.display_name,
        birthDate: profile.birth_date,
        ageGroup: score.age_group,
        scoreTotal: score.score_total,
        scoreLearningRate: score.score_learning_rate,
        percentile: score.age_group_percentile,
        status: statusMap.get(userId) ?? 'none',
        previousTotal: prev ? prev.score_total : null,
        rank: 0,
      } satisfies DriverRow;
    })
    .sort((a, b) => b.scoreTotal - a.scoreTotal);

  // Assign ranks (with ties)
  let currentRank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].scoreTotal < rows[i - 1].scoreTotal) currentRank = i + 1;
    rows[i].rank = currentRank;
  }

  // Apply filters from search params
  const filterParam = searchParams.filter ?? 'all';
  const ageGroupParam = searchParams.ageGroup ?? 'all';
  const minScore = parseInt(searchParams.minScore ?? '0', 10) || 0;

  const filtered = rows.filter((d) => {
    if (filterParam !== 'all' && d.status !== filterParam) return false;
    if (ageGroupParam !== 'all' && d.ageGroup !== ageGroupParam) return false;
    if (d.scoreTotal < minScore) return false;
    return true;
  });

  return (
    <div className="px-4 py-6 lg:p-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Talent Overview</h1>
        <p className="text-sm text-[#888888] mt-1">
          Drivers on the Watch List and Talent Pool
        </p>
      </div>

      {/* Filter bar */}
      <FilterBar
        resultCount={filtered.length}
        defaults={{
          filter: filterParam,
          ageGroup: ageGroupParam,
          minScore,
        }}
      />

      {/* Table */}
      <DriverTable drivers={filtered} />
    </div>
  );
}
