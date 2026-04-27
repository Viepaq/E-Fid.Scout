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
  nextGoalText: string;
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ScoutingStatus,
  { badgeText: string; badgeCls: string; motivation: string }
> = {
  none: {
    badgeCls: 'bg-white/5 text-slate-500 border border-white/[0.10]',
    badgeText: 'No Scout Status Yet',
    motivation: 'You are on your way. Meet the Watch List criteria to get noticed by scouts.',
  },
  watchlist: {
    badgeCls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    badgeText: 'Watch List',
    motivation: "You are on the scouts' radar. Stay consistent and work toward the Talent Pool.",
  },
  talent_pool: {
    badgeCls: 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20',
    badgeText: 'Talent Pool',
    motivation: 'You are in the Talent Pool. A Qualifier Event awaits.',
  },
  qualifier_invited: {
    badgeCls: 'bg-[#e8143c]/10 text-[#e8143c] border border-[#e8143c]/20',
    badgeText: 'Qualifier Invited',
    motivation: 'Congratulations. You have been invited to a Qualifier Event. Check your email.',
  },
};

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
  if (!currentStage) return 'future';
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const stageIdx   = STAGE_ORDER.indexOf(stage);
  if (stageIdx < currentIdx) return 'completed';
  if (stageIdx === currentIdx) return 'current';
  return 'future';
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  valueCls = 'text-white',
}: {
  label: string;
  value: string;
  sub: string;
  valueCls?: string;
}) {
  return (
    <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-white/[0.12] transition-colors">
      <p className="text-[10px] text-slate-600 uppercase tracking-[0.14em] font-semibold mb-3">{label}</p>
      <p className={`text-3xl font-black leading-none ${valueCls}`}>{value}</p>
      <p className="text-[11px] text-slate-700 mt-2">{sub}</p>
    </div>
  );
}

// ─── Checklist item ───────────────────────────────────────────────────────────

function CheckItem({ c }: { c: Criterion }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-0.5 w-6 h-6 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold border ${
          c.met
            ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20'
            : 'bg-[#e8143c]/10 text-[#e8143c] border-[#e8143c]/20'
        }`}
      >
        {c.met ? '✓' : '✗'}
      </div>
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm text-slate-200 font-medium leading-tight">{c.label}</p>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className={c.met ? 'text-[#22c55e] font-semibold' : 'text-slate-500'}>
            Now: {c.current}
          </span>
          {!c.met && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-slate-600">Need: {c.target}</span>
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
  const borderCls =
    state === 'completed'
      ? 'border-[#22c55e]/25 bg-[#22c55e]/[0.02]'
      : state === 'current'
        ? 'border-[#e8143c]/35 bg-[#e8143c]/[0.03]'
        : 'border-white/[0.07]';

  const opacity = state === 'future' ? 'opacity-35' : 'opacity-100';

  const headerCls =
    state === 'completed'
      ? 'text-[#22c55e]'
      : state === 'current'
        ? 'text-white'
        : 'text-slate-600';

  const badge =
    state === 'completed' ? (
      <span className="text-[10px] font-bold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
        Completed
      </span>
    ) : state === 'current' ? (
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#e8143c] bg-[#e8143c]/10 border border-[#e8143c]/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-[#e8143c] animate-pulse shadow-[0_0_4px_rgba(232,20,60,0.7)]" />
        Active
      </span>
    ) : null;

  return (
    <div className={`bg-[#13131e] border rounded-2xl p-5 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${borderCls} ${opacity}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-[10px] font-bold uppercase tracking-[0.14em] ${headerCls}`}>
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
        className={active ? 'text-[#e8143c]' : 'text-slate-700'}
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
    db.from('scouting_status').select('status').eq('user_id', user.id).maybeSingle(),
    db.from('race_results').select('track_name, race_date').eq('user_id', user.id).gte('race_date', cutoff90),
    db
      .from('iracing_history')
      .select('safety_rating')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const scoreData   = scoreResult.data as { score_learning_rate: number; age_group_percentile: number | null } | null;
  const statusData  = statusResult.data as { status: ScoutingStatus } | null;
  const races       = (racesResult.data ?? []) as { track_name: string | null; race_date: string | null }[];
  const historyData = historyResult.data as { safety_rating: number | null } | null;

  if (!scoreData) {
    return (
      <div className="p-8 flex items-center justify-center h-80">
        <p className="text-slate-500 text-sm">
          Your score is still being calculated. Check back shortly.
        </p>
      </div>
    );
  }

  const metrics: Metrics = {
    percentile:      scoreData.age_group_percentile ?? 50,
    learningRate:    scoreData.score_learning_rate,
    races90d:        races.length,
    uniqueTracks90d: new Set(races.map((r) => r.track_name).filter(Boolean)).size,
    currentSafety:   historyData?.safety_rating ?? 0,
    scoutingStatus:  statusData?.status ?? 'none',
  };

  const { scoutingStatus } = metrics;
  const statusCfg = STATUS_CONFIG[scoutingStatus];

  const watchlistCriteria  = buildWatchlistCriteria(metrics);
  const talentPoolCriteria = buildTalentPoolCriteria(metrics);

  const allCriteria  = [...watchlistCriteria, ...talentPoolCriteria];
  const firstUnmet   = allCriteria.find((c) => !c.met);
  const metCount     = allCriteria.filter((c) => c.met).length;
  const totalCount   = allCriteria.length;
  const topPct       = 100 - metrics.percentile;

  const watchState  = stageState('watchlist', scoutingStatus);
  const poolState   = stageState('talent_pool', scoutingStatus);
  const qualState   = stageState('qualifier_invited', scoutingStatus);
  const tryoutState = stageState('fat_tryout', scoutingStatus);

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 lg:space-y-7 max-w-2xl">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold mb-1.5">Scouting Pathway</p>
        <h1 className="text-2xl font-extrabold text-white">Your Progress</h1>
      </div>

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <KpiCard
          label="Status"
          value={scoutingStatus === 'none' ? 'None' : statusCfg.badgeText}
          sub="scouting level"
          valueCls={scoutingStatus !== 'none' ? 'text-[#e8143c]' : 'text-slate-600'}
        />
        <KpiCard
          label="Criteria Met"
          value={`${metCount}/${totalCount}`}
          sub="requirements"
          valueCls={metCount === totalCount ? 'text-[#e8143c]' : 'text-white'}
        />
        <KpiCard
          label="Age Group Rank"
          value={`Top ${topPct}%`}
          sub="percentile"
          valueCls={topPct <= 10 ? 'text-[#e8143c]' : topPct <= 30 ? 'text-[#f59e0b]' : 'text-white'}
        />
      </div>

      {/* ── Pathway visual ───────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.14em] font-semibold mb-4">Pathway Stages</p>

        <div className="space-y-0">
          {/* Stage 1 — Watch List */}
          <StageCard title="Stage 1 — Watch List" state={watchState}>
            <div className="space-y-3">
              {watchlistCriteria.map((c) => (
                <CheckItem key={c.label} c={c} />
              ))}
            </div>
          </StageCard>

          <Arrow active={watchState === 'completed' || scoutingStatus === 'watchlist'} />

          {/* Stage 2 — Talent Pool */}
          <StageCard title="Stage 2 — Talent Pool" state={poolState}>
            <div className="space-y-3">
              {talentPoolCriteria.map((c) => (
                <CheckItem key={c.label} c={c} />
              ))}
            </div>
          </StageCard>

          <Arrow active={poolState === 'completed' || scoutingStatus === 'talent_pool'} />

          {/* Stage 3 — Qualifier Event */}
          <StageCard title="Stage 3 — Qualifier Event" state={qualState}>
            <p className="text-sm text-slate-500 leading-relaxed">
              By invitation only — top Talent Pool drivers receive Qualifier Event
              invitations via email.
            </p>
          </StageCard>

          <Arrow active={qualState === 'completed' || scoutingStatus === 'qualifier_invited'} />

          {/* Stage 4 — Real Motorsport Tryout */}
          <StageCard title="Stage 4 — Real Motorsport Tryout" state={tryoutState}>
            <p className="text-sm text-slate-500 leading-relaxed">
              Winners of Qualifier Events receive an invitation to a physical
              real-world motorsport tryout with our scouting partners.
            </p>
          </StageCard>
        </div>
      </div>

      {/* ── Next goal ────────────────────────────────────────────────────── */}
      {firstUnmet ? (
        <div className="relative overflow-hidden bg-[#13131e] border border-white/[0.07] rounded-2xl p-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#e8143c] rounded-full" />
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.14em] font-semibold mb-2 pl-3">
            Your next goal
          </p>
          <p className="text-sm text-slate-300 leading-relaxed pl-3">
            {firstUnmet.nextGoalText}
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden bg-[#13131e] border border-white/[0.07] rounded-2xl p-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#22c55e] rounded-full" />
          <div className="flex items-center gap-2 mb-2 pl-3">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
            <p className="text-[10px] text-[#22c55e] uppercase tracking-[0.14em] font-bold">All criteria met</p>
          </div>
          <p className="text-sm text-slate-300 pl-3">
            <span className="text-white font-semibold">You have satisfied every requirement.</span>{' '}
            Keep performing at this level.
          </p>
        </div>
      )}
    </div>
  );
}
