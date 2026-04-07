import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import ScoreDimensions from '@/components/dashboard/ScoreDimensions';
import IratingChart from '@/components/shared/IratingChart';
import ScoreTrendChart from '@/components/shared/ScoreTrendChart';
import Sparkline from '@/components/shared/Sparkline';
import RecentRaces from '@/components/dashboard/RecentRaces';
import type { TalentScore, RaceResult, IracingHistory, ScoutingStatus } from '@/lib/database.types';

// ─── Pathway helpers (mirrored from dashboard/pathway) ───────────────────────

type PathwayMetrics = {
  percentile: number;
  learningRate: number;
  races90d: number;
  uniqueTracks90d: number;
  currentSafety: number;
};

type Criterion = { label: string; met: boolean; current: string; target: string };

function buildWatchlistCriteria(m: PathwayMetrics): Criterion[] {
  const topPct = 100 - m.percentile;
  return [
    { label: 'Top 10% of age group',        met: m.percentile >= 90,  current: `Top ${topPct}%`,                    target: 'Top 10%'  },
    { label: 'Learning Rate ≥ 50',           met: m.learningRate >= 50, current: String(m.learningRate),              target: '50'       },
    { label: '≥ 20 races in 90 days',        met: m.races90d >= 20,    current: `${m.races90d} races`,               target: '20 races' },
  ];
}

function buildTalentPoolCriteria(m: PathwayMetrics): Criterion[] {
  const topPct = 100 - m.percentile;
  return [
    { label: 'Top 3% of age group',          met: m.percentile >= 97,           current: `Top ${topPct}%`,                      target: 'Top 3%'   },
    { label: 'Learning Rate ≥ 60',           met: m.learningRate >= 60,          current: String(m.learningRate),                target: '60'       },
    { label: 'Safety Rating ≥ 3.0',          met: m.currentSafety >= 3.0,        current: m.currentSafety.toFixed(2),            target: '3.0'      },
    { label: '≥ 3 different tracks / 90d',   met: m.uniqueTracks90d >= 3,        current: `${m.uniqueTracks90d} tracks`,         target: '3 tracks' },
  ];
}

function CheckItem({ c }: { c: Criterion }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${c.met ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/15 text-[#ef4444]'}`}>
        {c.met ? '✓' : '✗'}
      </div>
      <div className="space-y-0.5">
        <p className="text-sm text-white font-medium">{c.label}</p>
        <div className="flex items-center gap-2 text-xs">
          <span className={c.met ? 'text-[#22c55e]' : 'text-[#888888]'}>{c.current}</span>
          {!c.met && <><span className="text-[#444]">·</span><span className="text-[#555]">Need: {c.target}</span></>}
        </div>
      </div>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ScoutingStatus }) {
  if (status === 'none') return <span className="text-xs text-[#888888]">No status</span>;
  const map: Record<string, { cls: string; label: string }> = {
    watchlist:         { cls: 'bg-blue-500/20 text-blue-400 border-blue-500/40',      label: 'Watch List'       },
    talent_pool:       { cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40',   label: 'Talent Pool'      },
    qualifier_invited: { cls: 'bg-green-500/20 text-green-400 border-green-500/40',   label: 'Qualifier Invited' },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─── Age helper ───────────────────────────────────────────────────────────────

function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let a = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
  return a;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DriverDetailPage({
  params,
}: {
  params: { userId: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const db = createServiceClient();
  const { userId } = params;
  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [profileResult, scoresResult, historyResult, racesResult, statusResult] =
    await Promise.all([
      db.from('profiles').select('display_name, birth_date, iracing_customer_id').eq('id', userId).single(),
      db.from('talent_scores').select('*').eq('user_id', userId).order('calculated_at', { ascending: false }),
      db.from('iracing_history').select('irating_value, recorded_at, safety_rating').eq('user_id', userId).gte('recorded_at', cutoff90).order('recorded_at', { ascending: true }),
      db.from('race_results').select('*').eq('user_id', userId).order('race_date', { ascending: false }).limit(10),
      db.from('scouting_status').select('status').eq('user_id', userId).maybeSingle(),
    ]);

  if (profileResult.error || !profileResult.data) notFound();

  const profile = profileResult.data as { display_name: string; birth_date: string; iracing_customer_id: string | null };
  const allScores = (scoresResult.data ?? []) as TalentScore[];
  const iRatingHistory = (historyResult.data ?? []) as Pick<IracingHistory, 'irating_value' | 'recorded_at'>[];
  const raceResults = (racesResult.data ?? []) as RaceResult[];
  const scoutingStatus = ((statusResult.data as { status: ScoutingStatus } | null)?.status) ?? 'none';

  const latestScore = allScores[0] ?? null;
  const previousScore = allScores[1] ?? null;

  // Pathway metrics
  const races90d = raceResults.filter((r) => r.race_date && r.race_date >= cutoff90).length;
  const uniqueTracks90d = new Set(raceResults.filter((r) => r.race_date && r.race_date >= cutoff90 && r.track_name).map((r) => r.track_name)).size;
  const historyRows = historyResult.data ?? [];
  const latestHistory = historyRows[historyRows.length - 1] as { safety_rating: number | null } | undefined;

  const metrics: PathwayMetrics = {
    percentile: latestScore?.age_group_percentile ?? 50,
    learningRate: latestScore?.score_learning_rate ?? 0,
    races90d,
    uniqueTracks90d,
    currentSafety: latestHistory?.safety_rating ?? 0,
  };

  const watchlistCriteria = buildWatchlistCriteria(metrics);
  const talentPoolCriteria = buildTalentPoolCriteria(metrics);
  const scoreTrend = allScores.map((s) => ({ score_total: s.score_total, calculated_at: s.calculated_at }));
  const sparklineValues = [...allScores].reverse().map((s) => s.score_total);

  return (
    <div className="px-4 py-6 lg:p-8 space-y-6 lg:space-y-8 max-w-5xl">

      {/* Back button */}
      <Link
        href="/scout"
        className="inline-flex items-center gap-1.5 text-sm text-[#888888] hover:text-white transition-colors"
      >
        ← Back to Talent Overview
      </Link>

      {/* ── Driver header ──────────────────────────────────────────────────── */}
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 lg:gap-6">
          <div className="space-y-2">
            <h1 className="text-xl lg:text-2xl font-bold text-white">{profile.display_name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-[#888888]">
                Age{' '}
                <span className="text-white font-medium">{calcAge(profile.birth_date)}</span>
              </span>
              {latestScore?.age_group && (
                <span className="text-[#888888]">
                  Group{' '}
                  <span className="text-white font-medium">{latestScore.age_group}</span>
                </span>
              )}
              {profile.iracing_customer_id && (
                <span className="text-[#555]">
                  iR: {profile.iracing_customer_id}
                </span>
              )}
            </div>
            <StatusBadge status={scoutingStatus} />
          </div>

          {/* Sparkline — score history */}
          {sparklineValues.length > 1 && (
            <div className="w-32 shrink-0">
              <p className="text-xs text-[#888888] mb-1 lg:text-right">Score history</p>
              <Sparkline values={sparklineValues} color="#22c55e" />
            </div>
          )}
        </div>
      </div>

      {/* ── Score overview ─────────────────────────────────────────────────── */}
      {latestScore && (
        <Section title="Talent Score Breakdown">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-[#22c55e] shrink-0"
              style={{ boxShadow: '0 0 16px #22c55e22' }}
            >
              <span className="text-2xl font-black text-white">{latestScore.score_total}</span>
            </div>
            <div>
              <p className="text-white font-semibold">Total Talent Score</p>
              {latestScore.age_group_percentile != null && (
                <p className="text-sm text-[#22c55e]">
                  Top {100 - latestScore.age_group_percentile}% in {latestScore.age_group}
                </p>
              )}
            </div>
          </div>
          <ScoreDimensions latestScore={latestScore} previousScore={previousScore} />
        </Section>
      )}

      {/* ── iRating chart ──────────────────────────────────────────────────── */}
      {iRatingHistory.length > 0 && (
        <Section title="iRating Progress (90 days)">
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-4">
            <IratingChart iRatingHistory={iRatingHistory} />
          </div>
        </Section>
      )}

      {/* ── Score trend chart ──────────────────────────────────────────────── */}
      {scoreTrend.length > 1 && (
        <Section title="Score Trend">
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-4">
            <ScoreTrendChart scores={scoreTrend} />
          </div>
        </Section>
      )}

      {/* ── Race history ───────────────────────────────────────────────────── */}
      <Section title="Recent Races (last 10)">
        <RecentRaces raceResults={raceResults} />
      </Section>

      {/* ── Pathway status ─────────────────────────────────────────────────── */}
      <Section title="Pathway Status">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-[#888888] uppercase tracking-wide">
              Watch List Criteria
            </h3>
            {watchlistCriteria.map((c) => <CheckItem key={c.label} c={c} />)}
          </div>
          <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-[#888888] uppercase tracking-wide">
              Talent Pool Criteria
            </h3>
            {talentPoolCriteria.map((c) => <CheckItem key={c.label} c={c} />)}
          </div>
        </div>
      </Section>

    </div>
  );
}
