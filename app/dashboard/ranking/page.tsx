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

const CHIP_GRADIENTS = [
  'from-emerald-600 to-emerald-800',
  'from-blue-600 to-blue-800',
  'from-violet-600 to-violet-800',
  'from-orange-500 to-orange-700',
  'from-cyan-600 to-cyan-800',
  'from-rose-600 to-rose-800',
  'from-amber-500 to-amber-700',
  'from-teal-600 to-teal-800',
];

function DriverChip({ name, rank }: { name: string; rank: number }) {
  const grad = CHIP_GRADIENTS[rank % CHIP_GRADIENTS.length];
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 text-[11px] font-bold text-white`}>
      {initials}
    </div>
  );
}

function ScoreBadge({ status }: { status: ScoutingStatus }) {
  if (status === 'none') return null;
  const map: Record<string, { cls: string; label: string }> = {
    watchlist:         { cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',      label: 'Watch List' },
    talent_pool:       { cls: 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20',  label: 'Talent Pool' },
    qualifier_invited: { cls: 'bg-[#e8143c]/10 text-[#e8143c] border-[#e8143c]/20',  label: 'Qualifier' },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${s.cls}`}>
      <span className="w-1 h-1 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

function TrendIndicator({ latest, previous }: { latest: RawScore; previous: RawScore | null }) {
  if (!previous) return <span className="text-slate-600">—</span>;
  const diff = latest.score_total - previous.score_total;
  if (diff >= 3)  return <span className="text-[#22c55e] font-semibold text-[11px] uppercase tracking-widest">▲ +{diff}</span>;
  if (diff <= -3) return <span className="text-[#ef4444] font-semibold text-[11px] uppercase tracking-widest">▼ {diff}</span>;
  return <span className="text-slate-600 text-[11px]">→</span>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.14em] font-semibold">{label}</p>
        {icon && <span className="text-slate-700">{icon}</span>}
      </div>
      <p className={`text-4xl font-black leading-none ${accent ? 'text-[#e8143c]' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-[11px] text-slate-600 mt-2">{sub}</p>
    </div>
  );
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
    <div className="relative overflow-hidden bg-[#13131e] border border-white/[0.07] rounded-2xl p-5">
      <div className="absolute top-0 left-0 w-1 h-full bg-[#e8143c] rounded-full" />
      <p className="text-[10px] text-slate-600 uppercase tracking-[0.14em] font-semibold mb-2 pl-3">Next Target</p>
      <p className="text-sm text-slate-300 leading-relaxed pl-3">
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
    ? 'bg-[#e8143c]/[0.04] border-l-2 border-l-[#e8143c]'
    : 'border-l-2 border-l-transparent hover:bg-white/[0.025]';

  const nameDisplay = isCurrentUser
    ? driver.displayName
    : anonymize(driver.displayName);

  const rankCls =
    driver.rank === 1 ? 'text-[#f59e0b] font-black' :
    driver.rank === 2 ? 'text-slate-300 font-bold' :
    driver.rank === 3 ? 'text-[#cd7c32] font-bold' :
    driver.rank <= 5  ? 'text-[#e8143c] font-bold' :
    'text-slate-600 font-semibold';

  return (
    <tr className={`transition-colors ${rowBase}`}>
      <td className="px-4 py-3.5 w-14">
        <span className={`text-sm ${rankCls}`}>#{driver.rank}</span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <DriverChip name={nameDisplay} rank={driver.rank} />
          <span className={`text-sm font-medium ${isCurrentUser ? 'text-white' : 'text-slate-500'}`}>
            {nameDisplay}
            {isCurrentUser && (
              <span className="ml-2 text-[10px] text-[#e8143c] font-bold uppercase tracking-widest">you</span>
            )}
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-sm font-bold text-white">{driver.latestScore.score_total}</span>
      </td>
      <td className="px-4 py-3.5">
        <TrendIndicator latest={driver.latestScore} previous={driver.previousScore} />
      </td>
      <td className="hidden md:table-cell px-4 py-3.5">
        <ScoreBadge status={driver.scoutingStatus} />
      </td>
    </tr>
  );
}

function EllipsisRow() {
  return (
    <tr>
      <td colSpan={5} className="px-4 py-2 text-center text-slate-700 text-sm tracking-widest">
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
        <p className="text-slate-500 text-sm">
          Your score is still being calculated. Check back shortly.
        </p>
      </div>
    );
  }

  const ageGroup = currentLatestScore.age_group;

  const [allScoresResult, allProfilesResult, allStatusesResult] = await Promise.all([
    db
      .from('talent_scores')
      .select('id, user_id, score_total, score_learning_rate, score_consistency, score_racecraft, score_versatility, score_activity, age_group, calculated_at')
      .eq('age_group', ageGroup)
      .order('calculated_at', { ascending: false }),
    db.from('profiles').select('id, display_name'),
    db.from('scouting_status').select('user_id, status'),
  ]);

  const allScores   = (allScoresResult.data ?? []) as RawScore[];
  const allProfiles = (allProfilesResult.data ?? []) as { id: string; display_name: string }[];
  const allStatuses = (allStatusesResult.data ?? []) as RawStatus[];

  const profileMap = new Map(allProfiles.map((p) => [p.id, p.display_name]));
  const statusMap  = new Map(allStatuses.map((s) => [s.user_id, s.status]));

  const latestByUser   = new Map<string, RawScore>();
  const previousByUser = new Map<string, RawScore>();

  for (const score of allScores) {
    if (!latestByUser.has(score.user_id)) {
      latestByUser.set(score.user_id, score);
    } else if (!previousByUser.has(score.user_id)) {
      previousByUser.set(score.user_id, score);
    }
  }

  const ranked: RankedDriver[] = Array.from(latestByUser.entries())
    .map(([userId, latestScore]) => ({
      userId,
      displayName: profileMap.get(userId) ?? 'Unknown',
      latestScore,
      previousScore: previousByUser.get(userId) ?? null,
      scoutingStatus: statusMap.get(userId) ?? 'none',
      rank: 0,
    }))
    .sort((a, b) => b.latestScore.score_total - a.latestScore.score_total);

  let currentRank = 1;
  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].latestScore.score_total < ranked[i - 1].latestScore.score_total) {
      currentRank = i + 1;
    }
    ranked[i].rank = currentRank;
  }

  const myIndex      = ranked.findIndex((d) => d.userId === user.id);
  const myDriver     = myIndex >= 0 ? ranked[myIndex] : null;
  const myRank       = myDriver?.rank ?? ranked.length + 1;
  const totalInGroup = ranked.length;

  const top20       = ranked.slice(0, 20);
  const userInTop20 = myIndex < 20;

  const targetIndex  = Math.max(0, myIndex - 5);
  const targetDriver = ranked[targetIndex] !== myDriver ? ranked[targetIndex] : null;
  const isInTopFive  = myRank <= 5;

  // Trend for KPI
  const myTrend = myDriver?.previousScore
    ? myDriver.latestScore.score_total - myDriver.previousScore.score_total
    : null;

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 lg:space-y-7 max-w-4xl">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-1.5">Driver Rankings</p>
        <h1 className="text-2xl font-extrabold text-white">Age Group <span className="text-[#e8143c]">{ageGroup}</span></h1>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Your Rank"
          value={`#${myRank}`}
          sub={`of ${totalInGroup} drivers`}
          accent
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
            </svg>
          }
        />
        <KpiCard
          label="Talent Score"
          value={String(myDriver?.latestScore.score_total ?? '—')}
          sub="current score"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          }
        />
        <KpiCard
          label="Total Drivers"
          value={String(totalInGroup)}
          sub={`in ${ageGroup}`}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <KpiCard
          label="Score Trend"
          value={myTrend !== null ? (myTrend >= 0 ? `+${myTrend}` : String(myTrend)) : '—'}
          sub="vs last calculation"
          accent={myTrend !== null && myTrend >= 0}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
          }
        />
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {(['Rank', 'Driver', 'Score', 'Trend'] as const).map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-[0.14em]"
                >
                  {h}
                </th>
              ))}
              <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-[0.14em]">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {top20.map((driver) => (
              <RankRow
                key={driver.userId}
                driver={driver}
                isCurrentUser={driver.userId === user.id}
              />
            ))}

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
          <div className="relative overflow-hidden bg-[#13131e] border border-white/[0.07] rounded-2xl p-5">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#22c55e] rounded-full" />
            <div className="flex items-center gap-2 mb-2 pl-3">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              <p className="text-[10px] text-[#22c55e] uppercase tracking-[0.14em] font-bold">Top 5 Driver</p>
            </div>
            <p className="text-sm text-slate-300 pl-3">
              <span className="text-white font-semibold">You are in the top 5 of your age group.</span>{' '}
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
