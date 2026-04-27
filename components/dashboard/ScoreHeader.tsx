import type { Profile, TalentScore, ScoutingStatusRow } from '@/lib/database.types';

type Props = {
  profile: Pick<Profile, 'display_name' | 'birth_date'>;
  latestScore: TalentScore;
  scoutingStatus: ScoutingStatusRow | null;
};

function ScoreBadge({ status }: { status: ScoutingStatusRow['status'] }) {
  if (status === 'none') return null;

  const styles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    watchlist:         { bg: 'bg-blue-500/10',         text: 'text-blue-400',    border: 'border-blue-500/20',      dot: 'bg-blue-400' },
    talent_pool:       { bg: 'bg-[#f59e0b]/10',        text: 'text-[#f59e0b]',  border: 'border-[#f59e0b]/20',     dot: 'bg-[#f59e0b]' },
    qualifier_invited: { bg: 'bg-[#22c55e]/10',        text: 'text-[#22c55e]',  border: 'border-[#22c55e]/20',     dot: 'bg-[#22c55e]' },
  };
  const labels: Record<string, string> = {
    watchlist: 'Watch List',
    talent_pool: 'Talent Pool',
    qualifier_invited: 'Qualifier',
  };

  const s = styles[status];
  if (!s) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {labels[status]}
    </span>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 46;
  const circ = 2 * Math.PI * radius;
  const filled = (score / 100) * circ;

  const color =
    score >= 80 ? '#e8143c' :
    score >= 60 ? '#f59e0b' :
    '#64748b';

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="relative w-32 h-32">
        {/* viewBox has 8px padding on each side so the glow isn't clipped */}
        <svg
          className="w-full h-full -rotate-90"
          viewBox="-8 -8 136 136"
        >
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6.5" />
          <circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6.5"
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}70)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-[32px] font-black text-white leading-none">{score}</span>
          <span className="text-[9px] text-slate-500 uppercase tracking-[0.14em]">Score</span>
        </div>
      </div>
    </div>
  );
}

export default function ScoreHeader({ profile, latestScore, scoutingStatus }: Props) {
  const percentile = latestScore.age_group_percentile ?? 50;
  const topPercent = Math.round(100 - percentile);

  const initials = profile.display_name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#13131e] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,20,60,0.08)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#e8143c]/[0.03] rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

      <div className="relative px-6 py-6 flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Left: driver info */}
        <div className="flex items-center gap-4 flex-1">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e8143c]/25 to-[#e8143c]/5 border border-[#e8143c]/25 flex items-center justify-center text-base font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
              {initials}
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-[#13131e] shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
          </div>

          {/* Text */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold text-[#e8143c] uppercase tracking-[0.15em]">
                Active Driver
              </p>
            </div>
            <h1 className="text-xl lg:text-2xl font-extrabold text-white leading-tight">
              {profile.display_name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {/* Age group pill */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                {latestScore.age_group}
              </span>
              {/* Percentile pill */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8143c]/[0.08] border border-[#e8143c]/20 text-[10px] text-[#e8143c] font-bold uppercase tracking-widest">
                Top {topPercent}% of age group
              </span>
              {/* Scouting badge */}
              {scoutingStatus && <ScoreBadge status={scoutingStatus.status} />}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-20 bg-white/[0.07]" />

        {/* Stats row */}
        <div className="hidden lg:flex items-center gap-8">
          <div className="text-center">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Learning</p>
            <p className="text-lg font-bold text-white">{latestScore.score_learning_rate}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Consistency</p>
            <p className="text-lg font-bold text-white">{latestScore.score_consistency}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Racecraft</p>
            <p className="text-lg font-bold text-white">{latestScore.score_racecraft}</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px h-20 bg-white/[0.07]" />

        {/* Score ring */}
        <div className="flex justify-center lg:block">
          <ScoreRing score={latestScore.score_total} />
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#e8143c]/30 to-transparent" />
    </div>
  );
}
