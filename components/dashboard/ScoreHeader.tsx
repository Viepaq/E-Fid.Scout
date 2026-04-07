import type { Profile, TalentScore, ScoutingStatusRow } from '@/lib/database.types';

type Props = {
  profile: Pick<Profile, 'display_name' | 'birth_date'>;
  latestScore: TalentScore;
  scoutingStatus: ScoutingStatusRow | null;
};

function ScoreBadge({ status }: { status: ScoutingStatusRow['status'] }) {
  if (status === 'none') return null;

  const styles: Record<string, string> = {
    watchlist: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    talent_pool: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    qualifier_invited: 'bg-green-500/15 text-green-400 border-green-500/30',
  };
  const labels: Record<string, string> = {
    watchlist: 'Watch List',
    talent_pool: 'Talent Pool',
    qualifier_invited: 'Qualifier',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 80 ? '#22c55e' : score >= 60 ? '#e8143c' : '#888888';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{
          border: `4px solid ${color}`,
          boxShadow: `0 0 20px ${color}22`,
        }}
      >
        <span className="text-3xl font-bold text-white">{score}</span>
      </div>
      <span className="text-xs text-[#888888] tracking-wide uppercase">
        Talent Score
      </span>
    </div>
  );
}

export default function ScoreHeader({ profile, latestScore, scoutingStatus }: Props) {
  const percentile = latestScore.age_group_percentile ?? 50;
  const topPercent = 100 - percentile;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
      {/* Driver info */}
      <div className="space-y-2">
        <h1 className="text-xl lg:text-2xl font-bold text-white">
          Welcome back, {profile.display_name}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-[#888888]">
            Age group:{' '}
            <span className="text-white font-medium">{latestScore.age_group}</span>
          </span>
          <span className="text-sm font-semibold text-[#e8143c]">
            Top {topPercent}% in your age group
          </span>
        </div>
        {scoutingStatus && <ScoreBadge status={scoutingStatus.status} />}
      </div>

      {/* Score circle — centered on mobile */}
      <div className="flex justify-center lg:block">
        <ScoreCircle score={latestScore.score_total} />
      </div>
    </div>
  );
}
