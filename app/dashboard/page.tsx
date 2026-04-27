import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import ScoreHeader from '@/components/dashboard/ScoreHeader';
import IratingChart from '@/components/dashboard/IratingChart';
import ScoreDimensions from '@/components/dashboard/ScoreDimensions';
import RecentRaces from '@/components/dashboard/RecentRaces';
import InsightsBox from '@/components/dashboard/InsightsBox';
import type { Profile, TalentScore, IracingHistory, RaceResult, ScoutingStatusRow } from '@/lib/database.types';

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em]">{text}</h2>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <svg
        className="w-8 h-8 animate-spin text-[#e8143c]"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12" cy="12" r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <p className="text-slate-500 text-sm">Your score is being calculated…</p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Use service role for all data reads — bypasses RLS, safe because
  // we already verified identity above and this code only runs server-side.
  const db = createServiceClient();

  const [profileResult, scoresResult, historyResult, racesResult, statusResult] =
    await Promise.all([
      db
        .from('profiles')
        .select('display_name, birth_date, iracing_customer_id')
        .eq('id', user.id)
        .single(),
      db
        .from('talent_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(2),
      db
        .from('iracing_history')
        .select('irating_value, recorded_at')
        .eq('user_id', user.id)
        .gte('recorded_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: true }),
      db
        .from('race_results')
        .select('*')
        .eq('user_id', user.id)
        .order('race_date', { ascending: false })
        .limit(5),
      db
        .from('scouting_status')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

  const profile = profileResult.data as Pick<Profile, 'display_name' | 'birth_date' | 'iracing_customer_id'> | null;
  const scores = (scoresResult.data ?? []) as TalentScore[];
  const iRatingHistory = (historyResult.data ?? []) as Pick<IracingHistory, 'irating_value' | 'recorded_at'>[];
  const raceResults = (racesResult.data ?? []) as RaceResult[];
  const scoutingStatus = statusResult.data as ScoutingStatusRow | null;

  const latestScore = scores[0] ?? null;
  const previousScore = scores[1] ?? null;

  if (!profile || !latestScore) {
    return (
      <div className="p-8">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 lg:space-y-7 max-w-6xl">

      {/* 1. Score header */}
      <ScoreHeader
        profile={profile}
        latestScore={latestScore}
        scoutingStatus={scoutingStatus}
      />

      {/* 2. iRating chart */}
      <section>
        <SectionLabel text="iRating Progress" />
        <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl px-5 pt-5 pb-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          <IratingChart iRatingHistory={iRatingHistory} />
        </div>
      </section>

      {/* 3. Score dimensions */}
      <section>
        <SectionLabel text="Talent Score Breakdown" />
        <ScoreDimensions latestScore={latestScore} previousScore={previousScore} />
      </section>

      {/* 4. Recent races + insights */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <SectionLabel text="Recent Races" />
            <RecentRaces raceResults={raceResults} />
          </div>
          <div className="lg:col-span-2">
            <SectionLabel icon="✦" text="Insights" />
            <InsightsBox insightsText={latestScore.insights_text} />
          </div>
        </div>
      </section>
    </div>
  );
}
