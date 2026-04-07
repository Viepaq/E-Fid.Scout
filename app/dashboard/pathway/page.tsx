import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { ScoutingStatus } from '@/lib/database.types';

// ─── Types ────────────────────────────────────────────────────────────────────

type Metrics = {
  percentile: number;
  learningRate: number;
  races90d: number;
  uniqueTracks90d: number;
  currentSafety: number;
  scoutingStatus: ScoutingStatus;
};

type Criterion = {
  label: string;
  met: boolean;
  current: string;
  target: string;
  nextGoalText: string; // human-readable goal description
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ScoutingStatus,
  { badge: string; badgeText: string; motivation: string }
> = {
  none: {
    badge: 'bg-[#222222] text-[#888888] border border-[#333333]',
    badgeText: 'No Scout Status Yet',
    motivation:
      'You are on your way. Meet the Watch List criteria to get noticed by scouts.',
  },
  watchlist: {
    badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/40',
    badgeText: 'Watch List',
    motivation:
      "You are on the scouts' radar. Stay consistent and work toward the Talent Pool.",
  },
  talent_pool: {
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/40',
    badgeText: 'Talent Pool',
    motivation:
      'You are in the FAT Karting League Talent Pool. A Qualifier Event awaits.',
  },
  qualifier_invited: {
    badge: 'bg-green-500/20 text-green-400 border border-green-500/40',
    badgeText: 'Qualifier Invited',
    motivation:
      'Congratulations. You have been invited to a Qualifier Event. Check your email.',
  },
};

// Stage order for the pathway visual
type Stage = 'watchlist' | 'talent_pool' | 'qualifier_invited' | 'fat_tryout';
const STAGE_ORDER: Stage[] = ['watchlist', 'talent_pool', 'qualifier_invited', 'fat_tryout'];

function stageState(
  stage: Stage,
  status: ScoutingStatus,
): 'completed' | 'current' | 'future' {
  const statusToStage: Partial<Record<ScoutingStatus, Stage>> = {
    watchlist: 'watchlist',
    talent_pool: 'talent_pool',
    qualifier_invited: 'qualifier_invited',
  };
  const currentStage = statusToStage[status];

  if (!currentStage) return 'future'; // 'none' → everything is future/target
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const stageIdx = STAGE_ORDER.indexOf(stage);

  if (stageIdx < currentIdx) return 'completed';
  if (stageIdx === currentIdx) return 'current';
  return 'future';
}

// ─── Checklist item ───────────────────────────────────────────────────────────

function CheckItem({ c }: { c: Criterion }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
          c.met
            ? 'bg-[#22c55e]/20 text-[#22c55e]'
            : 'bg-[#ef4444]/15 text-[#ef4444]'
        }`}
      >
        {c.met ? '✓' : '✗'}
      </div>
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm text-white font-medium leading-tight">{c.label}</p>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className={c.met ? 'text-[#22c55e]' : 'text-[#888888]'}>
            Now: {c.current}
          </span>
          {!c.met && (
            <>
              <span className="text-[#444444]">·</span>
              <span className="text-[#666666]">Need: {c.target}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({
  title,
  state,
  children,
}: {
  title: string;
  state: 'completed' | 'current' | 'future';
  children: React.ReactNode;
}) {
  const borderColor =
    state === 'completed'
      ? 'border-[#22c55e]/40'
      : state === 'current'
        ? 'border-[#e8143c]/50'
        : 'border-[#222222]';

  const opacity = state === 'future' ? 'opacity-40' : 'opacity-100';

  const headerColor =
    state === 'completed'
      ? 'text-[#22c55e]'
      : state === 'current'
        ? 'text-[#e8143c]'
        : 'text-[#888888]';

  const badge =
    state === 'completed' ? (
      <span className="text-[10px] font-semibold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/30 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
        Completed
      </span>
    ) : state === 'current' ? (
      <span className="text-[10px] font-semibold text-[#e8143c] bg-[#e8143c]/10 border border-[#e8143c]/30 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
        Current
      </span>
    ) : null;

  return (
    <div
      className={`bg-[#111111] border rounded-xl p-5 transition-opacity ${borderColor} ${opacity}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-bold uppercase tracking-wider ${headerColor}`}>
          {title}
        </h3>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ─── Arrow connector ──────────────────────────────────────────────────────────

function Arrow({ active }: { active: boolean }) {
  return (
    <div className="flex justify-center items-center py-1">
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        className={active ? 'text-[#e8143c]' : 'text-[#333333]'}
      >
        <path
          d="M8 0 L8 14 M3 10 L8 16 L13 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ─── Build criteria ───────────────────────────────────────────────────────────

function buildWatchlistCriteria(m: Metrics): Criterion[] {
  const topPct = 100 - m.percentile;
  return [
    {
      label: 'Top 10% of age group',
      met: m.percentile >= 90,
      current: `Top ${topPct}%`,
      target: 'Top 10%',
      nextGoalText: `Reach top 10% in your age group (currently top ${topPct}%, need top 10%)`,
    },
    {
      label: 'Learning Rate score ≥ 50',
      met: m.learningRate >= 50,
      current: String(m.learningRate),
      target: '50',
      nextGoalText: `Improve your Learning Rate from ${m.learningRate} to 50`,
    },
    {
      label: 'At least 20 races in 90 days',
      met: m.races90d >= 20,
      current: `${m.races90d} races`,
      target: '20 races',
      nextGoalText: `Race more — ${m.races90d} races in the last 90 days, need 20`,
    },
  ];
}

function buildTalentPoolCriteria(m: Metrics): Criterion[] {
  const topPct = 100 - m.percentile;
  return [
    {
      label: 'Top 3% of age group',
      met: m.percentile >= 97,
      current: `Top ${topPct}%`,
      target: 'Top 3%',
      nextGoalText: `Reach top 3% in your age group (currently top ${topPct}%, need top 3%)`,
    },
    {
      label: 'Learning Rate score ≥ 60',
      met: m.learningRate >= 60,
      current: String(m.learningRate),
      target: '60',
      nextGoalText: `Improve your Learning Rate from ${m.learningRate} to 60`,
    },
    {
      label: 'Safety Rating ≥ 3.0',
      met: m.currentSafety >= 3.0,
      current: m.currentSafety.toFixed(2),
      target: '3.0',
      nextGoalText: `Improve your Safety Rating from ${m.currentSafety.toFixed(2)} to 3.0`,
    },
    {
      label: 'At least 3 different tracks in 90 days',
      met: m.uniqueTracks90d >= 3,
      current: `${m.uniqueTracks90d} track${m.uniqueTracks90d !== 1 ? 's' : ''}`,
      target: '3 tracks',
      nextGoalText: `Race on more tracks — ${m.uniqueTracks90d} unique track${m.uniqueTracks90d !== 1 ? 's' : ''} in 90 days, need 3`,
    },
  ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PathwayPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const db = createServiceClient();
  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [scoreResult, statusResult, racesResult, historyResult] = await Promise.all([
    db
      .from('talent_scores')
      .select('score_learning_rate, age_group_percentile')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('scouting_status')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle(),
    db
      .from('race_results')
      .select('track_name, race_date')
      .eq('user_id', user.id)
      .gte('race_date', cutoff90),
    db
      .from('iracing_history')
      .select('safety_rating')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const scoreData = scoreResult.data as { score_learning_rate: number; age_group_percentile: number | null } | null;
  const statusData = statusResult.data as { status: ScoutingStatus } | null;
  const races = (racesResult.data ?? []) as { track_name: string | null; race_date: string | null }[];
  const historyData = historyResult.data as { safety_rating: number | null } | null;

  if (!scoreData) {
    return (
      <div className="p-8 flex items-center justify-center h-80">
        <p className="text-[#888888] text-sm">
          Your score is still being calculated. Check back shortly.
        </p>
      </div>
    );
  }

  const metrics: Metrics = {
    percentile: scoreData.age_group_percentile ?? 50,
    learningRate: scoreData.score_learning_rate,
    races90d: races.length,
    uniqueTracks90d: new Set(races.map((r) => r.track_name).filter(Boolean)).size,
    currentSafety: historyData?.safety_rating ?? 0,
    scoutingStatus: statusData?.status ?? 'none',
  };

  const { scoutingStatus } = metrics;
  const statusCfg = STATUS_CONFIG[scoutingStatus];

  const watchlistCriteria = buildWatchlistCriteria(metrics);
  const talentPoolCriteria = buildTalentPoolCriteria(metrics);

  // First unmet criterion across both stages
  const allCriteria = [...watchlistCriteria, ...talentPoolCriteria];
  const firstUnmet = allCriteria.find((c) => !c.met);

  // Arrow active states
  const watchState  = stageState('watchlist', scoutingStatus);
  const poolState   = stageState('talent_pool', scoutingStatus);
  const qualState   = stageState('qualifier_invited', scoutingStatus);
  const tryoutState = stageState('fat_tryout', scoutingStatus);

  return (
    <div className="px-4 py-6 lg:p-8 space-y-6 lg:space-y-8 max-w-2xl">

      {/* ── Status banner ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div
          className={`inline-flex items-center px-4 py-2 rounded-full text-base font-bold border ${statusCfg.badge}`}
        >
          {statusCfg.badgeText}
        </div>
        <p className="text-[#888888] text-sm leading-relaxed max-w-md">
          {statusCfg.motivation}
        </p>
      </div>

      {/* ── Pathway visual ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-4">
          Scouting Pathway
        </h2>

        <div className="space-y-0">
          {/* Stage 1 — Watch List */}
          <StageCard title="Watch List" state={watchState}>
            <div className="space-y-3">
              {watchlistCriteria.map((c) => (
                <CheckItem key={c.label} c={c} />
              ))}
            </div>
          </StageCard>

          <Arrow active={watchState === 'completed' || scoutingStatus === 'watchlist'} />

          {/* Stage 2 — Talent Pool */}
          <StageCard title="Talent Pool" state={poolState}>
            <div className="space-y-3">
              {talentPoolCriteria.map((c) => (
                <CheckItem key={c.label} c={c} />
              ))}
            </div>
          </StageCard>

          <Arrow active={poolState === 'completed' || scoutingStatus === 'talent_pool'} />

          {/* Stage 3 — Qualifier Event */}
          <StageCard title="Qualifier Event" state={qualState}>
            <p className="text-sm text-[#888888] leading-relaxed">
              By invitation only — top Talent Pool drivers receive Qualifier Event
              invitations via email.
            </p>
          </StageCard>

          <Arrow active={qualState === 'completed' || scoutingStatus === 'qualifier_invited'} />

          {/* Stage 4 — FAT Tryout */}
          <StageCard title="FAT Karting Tryout" state={tryoutState}>
            <p className="text-sm text-[#888888] leading-relaxed">
              Winners of Qualifier Events receive an invitation to a physical tryout
              with the FAT Karting League.
            </p>
          </StageCard>
        </div>
      </div>

      {/* ── Next goal ────────────────────────────────────────────────────── */}
      {firstUnmet ? (
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-xl p-5 border-l-[3px] border-l-[#e8143c]">
          <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-1">
            Your next goal
          </p>
          <p className="text-sm text-[#cccccc] leading-relaxed">
            {firstUnmet.nextGoalText}
          </p>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#333333] rounded-xl p-5 border-l-[3px] border-l-[#22c55e]">
          <p className="text-sm text-[#cccccc]">
            🏆{' '}
            <span className="text-white font-semibold">
              All criteria met.
            </span>{' '}
            You have satisfied every requirement — keep performing at this level.
          </p>
        </div>
      )}
    </div>
  );
}
