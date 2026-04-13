'use client';

import { useState, useRef, useEffect } from 'react';
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
  explanation: string;
};

const DIMENSIONS: Dimension[] = [
  {
    key: 'score_learning_rate',
    label: 'Learning Rate',
    explanation:
      'Measures how quickly your iRating improves over time. A high score means you are consistently gaining rating and absorbing new tracks, cars, and race situations faster than your peers.',
  },
  {
    key: 'score_consistency',
    label: 'Consistency',
    explanation:
      'Tracks how stable your lap times and results are across races. Consistent drivers avoid big swings in performance — a key trait scouts look for when evaluating real-world potential.',
  },
  {
    key: 'score_racecraft',
    label: 'Racecraft',
    explanation:
      'Evaluates your ability to race wheel-to-wheel cleanly. It combines incident rate, overtaking behaviour, and how well you defend positions without causing contact.',
  },
  {
    key: 'score_versatility',
    label: 'Versatility',
    explanation:
      'Reflects how well you perform across different car classes and track types. Drivers who adapt quickly to new environments score higher here.',
  },
  {
    key: 'score_activity',
    label: 'Activity',
    explanation:
      'Based on how frequently you compete. Regular racing keeps your data fresh and shows commitment — scouts want drivers who are actively developing, not just occasionally logging in.',
  },
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
  explanation,
}: {
  label: string;
  score: number;
  diff: number | null;
  explanation: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-3 hover:border-[#444444] transition-colors cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <span className="text-xs text-[#888888] uppercase tracking-wide leading-tight">
            {label}
          </span>
          <div className="flex items-center gap-2">
            <Trend diff={diff} />
            <span className="text-[#555555] hover:text-[#888888] transition-colors text-xs leading-none">
              ⓘ
            </span>
          </div>
        </div>
        <div className="text-3xl font-bold text-white">{score}</div>
        <div className="h-1 rounded-full bg-[#222222] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#e8143c] transition-all"
            style={{ width: `${score}%` }}
          />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 bg-[#1a1a1a] border border-[#333333] rounded-xl p-4 shadow-xl">
          <p className="text-xs font-semibold text-white uppercase tracking-wide mb-2">{label}</p>
          <p className="text-xs text-[#aaaaaa] leading-relaxed">{explanation}</p>
          <div className="absolute bottom-[-6px] left-6 w-3 h-3 bg-[#1a1a1a] border-r border-b border-[#333333] rotate-45" />
        </div>
      )}
    </div>
  );
}

export default function ScoreDimensions({ latestScore, previousScore }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {DIMENSIONS.map(({ key, label, explanation }) => {
        const score = latestScore[key] as number;
        const prev = previousScore ? (previousScore[key] as number) : null;
        const diff = prev !== null ? score - prev : null;
        return (
          <DimensionCard key={key} label={label} score={score} diff={diff} explanation={explanation} />
        );
      })}
    </div>
  );
}
