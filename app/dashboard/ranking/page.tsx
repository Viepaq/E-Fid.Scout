import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { AgeGroup, ScoutingStatus, TalentScore } from '@/lib/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────

type RawScore = {
  id: string;
  user_id: string;
  score_total: number;
  score_learning_rate: number;
  score_consistency: number;
  score_racecraft: number;
  score_versatility: number;
  score_activity: number;
  age_group: AgeGroup | null;
  calculated_at: string;
};

type RawStatus = {
  user_id: string;
  status: ScoutingStatus;
};

type RankedDriver = {
  userId: string;
  displayName: string;
  latestScore: RawScore;
  previousScore: RawScore | null;
  scoutingStatus: ScoutingStatus;
  rank: number;
};

type DimensionKey = keyof Pick<
  TalentScore,
  | 'score_learning_rate'
  | 'score_consistency'
  | 'score_racecraft'
  | 'score_versatility'
  | 'score_activity'
>;

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  score_learning_rate: 'Learning Rate',
  score_consistency: 'Consistency',
  score_racecraft: 'Racecraft',
  score_versatility: 'Versatility',
  score_activity: 'Activity',
};

const DIMENSIONS = Object.keys(DIMENSION_LABELS) as DimensionKey[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function anonymize(name: string): string {
  return name.slice(0, 3) + '***';
}

function ScoreBadge({ status }: { status: ScoutingStatus }) {
  if (status === 'none') return null;
  const map: Record<string, { cls: string; label: string }> = {
    watchlist:          { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',     label: 'Watch List' },
    talent_pool:        { cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', label: 'Talent Pool' },
    qualifier_invited:  { cls: 'bg-green-500/15 text-green-400 border-green-500/30',  label: 'Qualifier' },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function TrendIndicator({ latest, previous }: { latest: RawScore; previous: RawScore | null }) {
  if (!previous) return <span className="text-[#888888]">—</span>;
  const diff = latest.score_total - previous.score_total;
  if (diff >= 3)  return <span className="text-[#22c55e] font-medium text-sm">▲ +{diff}</span>;
  if (diff <= -3) return <span className="text-[#ef4444] font-medium text-sm">▼ {diff}</span>;
  return <span className="text-[#888888]">→</span>;
}

// ─── Improvement hint ─────────────────────────────────────────────────────────

function ImprovementHint({
  currentDriver,
  targetDriver,
  targetRank,
}: {
  currentDriver: RankedDriver;
  targetDriver: RankedDriver;
  targetRank: number;
}) {
  // Find which single dimension improvement would lift the total most
  let bestDim: DimensionKey = 'score_learning_rate';
  let bestGain = -Infinity;
  let targetValue = 0;

  for (const dim of DIMENSIONS) {
    const current = currentDriver.latestScore[dim] as number;
    const target = targetDriver.latestScore[dim] as number;
    const gain = target - current;
    if (gain > bestGain) {
      bestGain = gain;
      bestDim = dim;
      targetValue = target;
    }
  }

  const currentValue = currentDriver.latestScore[bestDim] as number;

  return (
    <div className="bg-[#1a1a1a] border border-[#333333] rounded-xl p-5 border-l-[3px] border-l-[#e8143c]">
      <p className="text-sm text-[#cccccc] leading-relaxed">
        To reach{' '}
        <span className="text-white font-semibold">rank #{targetRank}</span>, focus on
        improving your{' '}
        <span className="text-[#e8143c] font-semibold">
          {DIMENSION_LABELS[bestDim]}
        </span>{' '}
        from{' '}
        <span className="text-white font-semibold">{currentValue}</span> to{' '}
        <span className="text-white font-semibold">{targetValue}</span>.
      </p>
    </div>
  );
}

// ─── Ranking table row ────────────────────────────────────────────────────────

function RankRow({
  driver,
  isCurrentUser,
}: {
  driver: RankedDriver;
  isCurrentUser: boolean;
}) {
  const rowBase = isCurrentUser
    ? 'border-l-[3px] border-l-[#e8143c] bg-[#1a1a1a]'
    : 'border-l-[3px] border-l-transparent bg-transparent hover:bg-white/[0.02]';

  const nameDisplay = isCurrentUser
    ? driver.displayName
    : anonymize(driver.displayName);

  return (
    <tr className={`transition-colors ${rowBase}`}>
      <td className="px-4 py-3 w-12">
        <span
          className={`text-sm font-bold ${
            driver.rank <= 3 ? 'text-[#e8143c]' : 'text-[#888888]'
          }`}
        >
          #{driver.rank}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-sm font-medium ${
            isCurrentUser ? 'text-white' : 'text-[#888888]'
          }`}
        >
          {nameDisplay}
          {isCurrentUser && (
            <span className="ml-2 text-xs text-[#e8143c] font-normal">(you)</span>
          )}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-bold text-white">
          {driver.latestScore.score_total}
        </span>
      </td>
      <td className="px-4 py-3">
        <TrendIndicator
          latest={driver.latestScore}
          previous={driver.previousScore}
        />
      </td>
      <td className="hidden md:table-cell px-4 py-3">
        <ScoreBadge status={driver.scoutingStatus} />
      </td>
    </tr>
  );
}

function EllipsisRow() {
  return (
    <tr>
      <td colSpan={5} className="px-4 py-2 text-center text-[#888888] text-sm tracking-widest">
        · · ·
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RankingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const db = createServiceClient();

  // Load current user's profile + latest score
  const [profileResult, currentScoresResult] = await Promise.all([
    db.from('profiles').select('display_name').eq('id', user.id).single(),
    db
      .from('talent_scores')
      .select('*')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const currentProfile = profileResult.data as { display_name: string } | null;
  const currentLatestScore = currentScoresResult.data as RawScore | null;

  if (!currentLatestScore || !currentLatestScore.age_group) {
    return (
      <div className="p-8 flex items-center justify-center h-80">
        <p className="text-[#888888] text-sm">
          Your score is still being calculated. Check back shortly.
        </p>
      </div>
    );
  }

  const ageGroup = currentLatestScore.age_group;

  // Load ALL talent_scores for this age group + all profiles + scouting statuses
  const [allScoresResult, allProfilesResult, allStatusesResult] = await Promise.all([
    db
      .from('talent_scores')
      .select('id, user_id, score_total, score_learning_rate, score_consistency, score_racecraft, score_versatility, score_activity, age_group, calculated_at')
      .eq('age_group', ageGroup)
      .order('calculated_at', { ascending: false }),
    db.from('profiles').select('id, display_name'),
    db.from('scouting_status').select('user_id, status'),
  ]);

  const allScores = (allScoresResult.data ?? []) as RawScore[];
  const allProfiles = (allProfilesResult.data ?? []) as { id: string; display_name: string }[];
  const allStatuses = (allStatusesResult.data ?? []) as RawStatus[];

  // Build lookup maps
  const profileMap = new Map(allProfiles.map((p) => [p.id, p.display_name]));
  const statusMap = new Map(allStatuses.map((s) => [s.user_id, s.status]));

  // Deduplicate: keep latest + second-latest per user_id
  const latestByUser = new Map<string, RawScore>();
  const previousByUser = new Map<string, RawScore>();

  for (const score of allScores) {
    if (!latestByUser.has(score.user_id)) {
      latestByUser.set(score.user_id, score);
    } else if (!previousByUser.has(score.user_id)) {
      previousByUser.set(score.user_id, score);
    }
  }

  // Build ranked list, sort by score_total DESC
  const ranked: RankedDriver[] = Array.from(latestByUser.entries())
    .map(([userId, latestScore]) => ({
      userId,
      displayName: profileMap.get(userId) ?? 'Unknown',
      latestScore,
      previousScore: previousByUser.get(userId) ?? null,
      scoutingStatus: statusMap.get(userId) ?? 'none',
      rank: 0, // assigned below
    }))
    .sort((a, b) => b.latestScore.score_total - a.latestScore.score_total);

  // Assign ranks (ties get same rank)
  let currentRank = 1;
  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].latestScore.score_total < ranked[i - 1].latestScore.score_total) {
      currentRank = i + 1;
    }
    ranked[i].rank = currentRank;
  }

  const myIndex = ranked.findIndex((d) => d.userId === user.id);
  const myDriver = myIndex >= 0 ? ranked[myIndex] : null;
  const myRank = myDriver?.rank ?? ranked.length + 1;
  const totalInGroup = ranked.length;

  // Build the visible rows
  const top20 = ranked.slice(0, 20);
  const userInTop20 = myIndex < 20;

  // Improvement hint: driver 5 ranks above (by index, not rank number for simplicity)
  const targetIndex = Math.max(0, myIndex - 5);
  const targetDriver = ranked[targetIndex] !== myDriver ? ranked[targetIndex] : null;
  const isInTopFive = myRank <= 5;

  return (
    <div className="px-4 py-6 lg:p-8 space-y-6 lg:space-y-8 max-w-4xl">

      {/* ── Rank header ──────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl lg:text-5xl font-black text-[#e8143c]">#{myRank}</span>
          <span className="text-lg lg:text-2xl font-bold text-white">
            of {totalInGroup} drivers
          </span>
        </div>
        <p className="text-sm text-[#888888]">
          Age group:{' '}
          <span className="text-white font-medium">{ageGroup}</span>
        </p>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#222222]">
              {(['Rank', 'Driver', 'Score', 'Trend'] as const).map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
              <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {top20.map((driver) => (
              <RankRow
                key={driver.userId}
                driver={driver}
                isCurrentUser={driver.userId === user.id}
              />
            ))}

            {/* Show ellipsis + current user row if outside top 20 */}
            {!userInTop20 && myDriver && (
              <>
                <EllipsisRow />
                <RankRow driver={myDriver} isCurrentUser />
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Improvement hint ─────────────────────────────────────────────── */}
      {myDriver && (
        isInTopFive ? (
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-xl p-5 border-l-[3px] border-l-[#22c55e]">
            <p className="text-sm text-[#cccccc]">
              🏆{' '}
              <span className="text-white font-semibold">
                You are in the top 5 of your age group.
              </span>{' '}
              Outstanding performance.
            </p>
          </div>
        ) : targetDriver ? (
          <ImprovementHint
            currentDriver={myDriver}
            targetDriver={targetDriver}
            targetRank={targetDriver.rank}
          />
        ) : null
      )}
    </div>
  );
}
