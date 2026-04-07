import type { TalentScore } from '@/lib/database.types';

type Props = {
  latestScore: TalentScore;
  previousScore: TalentScore | null;
};

type Dimension = {
  key: keyof Pick<
    TalentScore,
    | 'score_learning_rate'
    | 'score_consistency'
    | 'score_racecraft'
    | 'score_versatility'
    | 'score_activity'
  >;
  label: string;
};

const DIMENSIONS: Dimension[] = [
  { key: 'score_learning_rate', label: 'Learning Rate' },
  { key: 'score_consistency',   label: 'Consistency' },
  { key: 'score_racecraft',     label: 'Racecraft' },
  { key: 'score_versatility',   label: 'Versatility' },
  { key: 'score_activity',      label: 'Activity' },
];

function Trend({ diff }: { diff: number | null }) {
  if (diff === null) return null;

  if (diff >= 3)
    return (
      <span className="text-xs font-medium text-[#22c55e]">
        ▲ +{diff}
      </span>
    );
  if (diff <= -3)
    return (
      <span className="text-xs font-medium text-[#ef4444]">
        ▼ {diff}
      </span>
    );
  return <span className="text-xs text-[#888888]">→</span>;
}

function DimensionCard({
  label,
  score,
  diff,
}: {
  label: string;
  score: number;
  diff: number | null;
}) {
  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <span className="text-xs text-[#888888] uppercase tracking-wide leading-tight">
          {label}
        </span>
        <Trend diff={diff} />
      </div>
      <div className="text-3xl font-bold text-white">{score}</div>
      {/* Progress bar */}
      <div className="h-1 rounded-full bg-[#222222] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#e8143c] transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function ScoreDimensions({ latestScore, previousScore }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {DIMENSIONS.map(({ key, label }) => {
        const score = latestScore[key] as number;
        const prev = previousScore ? (previousScore[key] as number) : null;
        const diff = prev !== null ? score - prev : null;
        return (
          <DimensionCard key={key} label={label} score={score} diff={diff} />
        );
      })}
    </div>
  );
}
