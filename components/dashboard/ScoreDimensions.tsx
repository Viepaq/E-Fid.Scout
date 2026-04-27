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
  shortLabel: string;
  icon: React.ReactNode;
  explanation: string;
};

const LearnIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);
const ConsistencyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const RacecraftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
  </svg>
);
const VersatilityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
  </svg>
);
const ActivityIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const DIMENSIONS: Dimension[] = [
  {
    key: 'score_learning_rate',
    label: 'Learning Rate',
    shortLabel: 'Learning',
    icon: <LearnIcon />,
    explanation: 'Measures how quickly your iRating improves over time. A high score means you are consistently gaining rating and absorbing new tracks, cars, and race situations faster than your peers.',
  },
  {
    key: 'score_consistency',
    label: 'Consistency',
    shortLabel: 'Consistency',
    icon: <ConsistencyIcon />,
    explanation: 'Tracks how stable your lap times and results are across races. Consistent drivers avoid big swings in performance — a key trait scouts look for when evaluating real-world potential.',
  },
  {
    key: 'score_racecraft',
    label: 'Racecraft',
    shortLabel: 'Racecraft',
    icon: <RacecraftIcon />,
    explanation: 'Evaluates your ability to race wheel-to-wheel cleanly. It combines incident rate, overtaking behaviour, and how well you defend positions without causing contact.',
  },
  {
    key: 'score_versatility',
    label: 'Versatility',
    shortLabel: 'Versatility',
    icon: <VersatilityIcon />,
    explanation: 'Reflects how well you perform across different car classes and track types. Drivers who adapt quickly to new environments score higher here.',
  },
  {
    key: 'score_activity',
    label: 'Activity',
    shortLabel: 'Activity',
    icon: <ActivityIcon />,
    explanation: 'Based on how frequently you compete. Regular racing keeps your data fresh and shows commitment — scouts want drivers who are actively developing, not just occasionally logging in.',
  },
];

function tierLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Elite',       color: 'text-[#e8143c]' };
  if (score >= 60) return { label: 'Strong',      color: 'text-[#f59e0b]' };
  if (score >= 40) return { label: 'Competitive', color: 'text-blue-400' };
  return              { label: 'Developing',  color: 'text-slate-600' };
}

function Trend({ diff }: { diff: number | null }) {
  if (diff === null) return null;
  if (diff >= 3) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#22c55e] bg-[#22c55e]/10 px-1.5 py-0.5 rounded-full border border-[#22c55e]/20">
      ▲ +{diff}
    </span>
  );
  if (diff <= -3) return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#ef4444] bg-[#ef4444]/10 px-1.5 py-0.5 rounded-full border border-[#ef4444]/20">
      ▼ {diff}
    </span>
  );
  return <span className="text-[10px] text-slate-700">—</span>;
}

function DimensionCard({
  label,
  score,
  diff,
  explanation,
  icon,
}: {
  label: string;
  score: number;
  diff: number | null;
  explanation: string;
  icon: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tier = tierLabel(score);

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

  const barColor =
    score >= 80 ? 'bg-[#e8143c]' :
    score >= 60 ? 'bg-[#f59e0b]' :
    score >= 40 ? 'bg-blue-500' :
    'bg-slate-600';

  const barGlow =
    score >= 80 ? 'shadow-[0_0_10px_rgba(232,20,60,0.5)]' :
    score >= 60 ? 'shadow-[0_0_10px_rgba(245,158,11,0.4)]' :
    '';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group w-full text-left bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 space-y-4 hover:border-[#e8143c]/25 hover:bg-[#1a1a28] transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 group-hover:text-[#e8143c] transition-colors">
              {icon}
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-[0.12em] font-semibold leading-tight">
              {label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Trend diff={diff} />
            <span className="text-slate-700 group-hover:text-slate-500 transition-colors text-[11px]">ⓘ</span>
          </div>
        </div>

        {/* Score */}
        <div className="flex items-end gap-2">
          <span className="text-[42px] font-black text-white leading-none">{score}</span>
          <span className={`text-[10px] font-bold uppercase tracking-[0.1em] mb-1.5 ${tier.color}`}>
            {tier.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} ${barGlow} transition-all duration-700`}
            style={{ width: `${score}%` }}
          />
        </div>
      </button>

      {/* Tooltip */}
      {open && (
        <div className="absolute z-50 bottom-full left-0 mb-3 w-64 bg-[#1a1a28] border border-white/[0.10] rounded-2xl p-4 shadow-[0_16px_40px_rgba(0,0,0,0.7)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#e8143c]">{icon}</span>
            <p className="text-[11px] font-bold text-white uppercase tracking-widest">{label}</p>
          </div>
          <p className="text-[12px] text-slate-400 leading-relaxed">{explanation}</p>
          <div className="absolute bottom-[-7px] left-6 w-3.5 h-3.5 bg-[#1a1a28] border-r border-b border-white/[0.10] rotate-45" />
        </div>
      )}
    </div>
  );
}

export default function ScoreDimensions({ latestScore, previousScore }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {DIMENSIONS.map(({ key, label, icon, explanation }) => {
        const score = latestScore[key] as number;
        const prev = previousScore ? (previousScore[key] as number) : null;
        const diff = prev !== null ? score - prev : null;
        return (
          <DimensionCard key={key} label={label} score={score} diff={diff} explanation={explanation} icon={icon} />
        );
      })}
    </div>
  );
}
