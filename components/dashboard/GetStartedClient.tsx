'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { ScoutingStatus, TalentScore } from '@/lib/database.types';

type Props = {
  displayName: string;
  score: Pick<
    TalentScore,
    'score_total' | 'score_learning_rate' | 'score_consistency' | 'score_racecraft' | 'score_versatility' | 'score_activity'
  > | null;
  scoutingStatus: ScoutingStatus | 'none';
};

// ─── Fade-up animation hook ────────────────────────────────────────────────────
function useFadeUp(ref: React.RefObject<HTMLElement | null>, delay = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = `opacity 500ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, ref]);
}

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useFadeUp(ref as React.RefObject<HTMLElement>, delay);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ─── Score tier label ─────────────────────────────────────────────────────────
function scoreTier(value: number) {
  if (value >= 80) return { label: 'Elite', color: '#CB3C33' };
  if (value >= 60) return { label: 'Strong', color: '#f59e0b' };
  if (value >= 40) return { label: 'Competitive', color: '#3b82f6' };
  return { label: 'Developing', color: '#888888' };
}

// ─── Pathway status helper ────────────────────────────────────────────────────
type StageStatus = 'completed' | 'current' | 'future';

function pathwayStageStatus(
  stage: 'watchlist' | 'talent_pool' | 'qualifier_invited',
  status: ScoutingStatus | 'none'
): StageStatus {
  const order = ['none', 'watchlist', 'talent_pool', 'qualifier_invited'] as const;
  const currentIdx = order.indexOf(status as typeof order[number]);
  const stageIdx = order.indexOf(stage);
  if (currentIdx > stageIdx) return 'completed';
  if (currentIdx === stageIdx) return 'current';
  return 'future';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreCircle({ value }: { value: number | null }) {
  const display = value ?? null;
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const filled = display !== null ? (display / 100) * circ : 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#222222" strokeWidth="8" />
          {display !== null && (
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke="#CB3C33"
              strokeWidth="8"
              strokeDasharray={`${filled} ${circ}`}
              strokeLinecap="round"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-white leading-none">
            {display ?? '—'}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-[#CB3C33] uppercase tracking-[0.15em] font-semibold">
        Your Talent Score
      </p>
      <p className="text-[11px] text-[#555555]">Updated every 24h</p>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
  delay,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <FadeUp delay={delay} className="relative bg-[#111111] border border-[#222222] border-l-2 border-l-[#CB3C33] rounded-xl p-6 overflow-hidden hover:border-[rgba(203,60,51,0.5)] transition-colors group">
      <span className="absolute top-3 right-4 text-6xl font-black text-[#CB3C33] opacity-10 leading-none select-none">
        {number}
      </span>
      <div className="relative z-10 space-y-3">
        <div className="w-8 h-8 flex items-center justify-center text-white">
          {icon}
        </div>
        <p className="font-bold text-white text-sm">{title}</p>
        <p className="text-[#888888] text-sm leading-relaxed">{description}</p>
      </div>
    </FadeUp>
  );
}

function DimensionCard({
  label,
  value,
  description,
  delay,
}: {
  label: string;
  value: number | null;
  description: string;
  delay: number;
}) {
  const tier = value !== null ? scoreTier(value) : null;
  return (
    <FadeUp delay={delay} className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-3">
      <p className="text-[11px] text-[#CB3C33] uppercase tracking-[0.1em] font-semibold">{label}</p>
      <p className="text-3xl font-black text-white">{value ?? '?'}</p>
      <div className="h-[3px] rounded-full bg-[#222222] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#CB3C33] transition-all"
          style={{ width: value !== null ? `${value}%` : '0%' }}
        />
      </div>
      <p className="text-[12px] text-[#666666] leading-snug">{description}</p>
      {tier && (
        <span className="text-[11px] font-semibold" style={{ color: tier.color }}>
          {tier.label}
        </span>
      )}
    </FadeUp>
  );
}

function PathwayStageCard({
  title,
  requirement,
  status,
  delay,
}: {
  title: string;
  requirement: string;
  status: StageStatus;
  delay: number;
}) {
  const borderColor =
    status === 'current' ? '#CB3C33' : status === 'completed' ? '#22c55e' : '#222222';
  const badge =
    status === 'current'
      ? { label: 'CURRENT', color: '#CB3C33' }
      : status === 'completed'
      ? { label: '✓ ACHIEVED', color: '#22c55e' }
      : null;

  return (
    <FadeUp delay={delay} className="flex-1 bg-[#111111] rounded-xl p-5 space-y-3" style={{ border: `1px solid ${borderColor}` }}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-white text-sm">{title}</p>
        {badge && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{ color: badge.color, borderColor: badge.color }}
          >
            {badge.label}
          </span>
        )}
      </div>
      <p className="text-[#888888] text-sm leading-relaxed">{requirement}</p>
    </FadeUp>
  );
}

function ActionCard({
  title,
  description,
  buttonLabel,
  href,
  delay,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  href: string;
  delay: number;
}) {
  return (
    <FadeUp delay={delay} className="flex-1 bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col gap-4">
      <div className="space-y-2 flex-1">
        <p className="font-bold text-white text-sm">{title}</p>
        <p className="text-[#888888] text-sm leading-relaxed">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-block text-center border border-[#CB3C33] text-[#CB3C33] text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:bg-[#CB3C33] hover:text-white"
      >
        {buttonLabel}
      </Link>
    </FadeUp>
  );
}

// ─── Main client component ────────────────────────────────────────────────────
export default function GetStartedClient({ displayName, score, scoutingStatus }: Props) {
  const watchStatus = pathwayStageStatus('watchlist', scoutingStatus);
  const poolStatus = pathwayStageStatus('talent_pool', scoutingStatus);
  const qualStatus = pathwayStageStatus('qualifier_invited', scoutingStatus);

  return (
    <div className="max-w-6xl space-y-10 px-4 py-6 lg:p-8">

      {/* ── SECTION 1: Hero Banner ─────────────────────────────────────────── */}
      <FadeUp delay={0}>
        <div
          className="rounded-2xl overflow-hidden p-8 lg:p-10"
          style={{
            background: 'linear-gradient(135deg, #1a0a0a 0%, #0a0a0a 100%)',
            border: '1px solid #1f1010',
            boxShadow: 'inset -200px -100px 400px rgba(203,60,51,0.06), inset 200px 100px 400px transparent',
          }}
        >
          <div
            className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at top right, rgba(203,60,51,0.18) 0%, transparent 65%)',
            }}
          />
          <div className="relative flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
            {/* Left */}
            <div className="space-y-3 max-w-xl">
              <p
                className="text-[11px] font-semibold uppercase"
                style={{ color: '#CB3C33', letterSpacing: '0.15em' }}
              >
                Welcome to FID-Scout
              </p>
              <h1 className="text-[28px] font-extrabold text-white leading-tight">
                Your path to real-world racing<br className="hidden lg:block" /> starts here.
              </h1>
              <p className="text-[14px] text-[#888888] leading-relaxed">
                FID-Scout analyzes your iRacing performance across 5 dimensions and connects
                top talents with real motorsport organizations.
              </p>
            </div>
            {/* Right — Score circle */}
            <div className="shrink-0">
              <ScoreCircle value={score?.score_total ?? null} />
            </div>
          </div>
        </div>
      </FadeUp>

      {/* ── SECTION 2: How it works ────────────────────────────────────────── */}
      <section className="space-y-6">
        <FadeUp delay={0}>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">How FID-Scout works</h2>
            <p className="text-sm text-[#888888]">Three steps from the simulator to the real track.</p>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StepCard
            number="01"
            delay={0}
            title="Connect iRacing"
            description="Your iRacing account is the data source. Once connected, we automatically pull your full race history, iRating progression and safety rating."
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            }
          />
          <StepCard
            number="02"
            delay={80}
            title="Get Your Score"
            description="Our algorithm analyzes your performance across 5 dimensions: Learning Rate, Consistency, Racecraft, Versatility and Activity. The result is your personal Talent Score from 0 to 100."
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            }
          />
          <StepCard
            number="03"
            delay={160}
            title="Get Discovered"
            description="Top performers enter our Scouting Pathway. The best talents get noticed by real motorsport organizations and earn their shot at the real thing."
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ── SECTION 3: 5 Dimensions ────────────────────────────────────────── */}
      <section className="space-y-6">
        <FadeUp delay={0}>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">Your 5 Talent Dimensions</h2>
            <p className="text-sm text-[#888888]">Every dimension tells a different part of your story.</p>
          </div>
        </FadeUp>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <DimensionCard label="Learning Rate" value={score?.score_learning_rate ?? null} description="How fast you improve over time" delay={0} />
          <DimensionCard label="Consistency"   value={score?.score_consistency ?? null}   description="How reliable your race results are" delay={80} />
          <DimensionCard label="Racecraft"     value={score?.score_racecraft ?? null}     description="How well you perform wheel-to-wheel" delay={160} />
          <DimensionCard label="Versatility"   value={score?.score_versatility ?? null}   description="How you adapt to different tracks and cars" delay={240} />
          <DimensionCard label="Activity"      value={score?.score_activity ?? null}      description="How seriously you train and compete" delay={320} />
        </div>
      </section>

      {/* ── SECTION 4: Scouting Pathway ───────────────────────────────────── */}
      <section className="space-y-6">
        <FadeUp delay={0}>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">The Scouting Pathway</h2>
            <p className="text-sm text-[#888888]">Every great driver starts somewhere.</p>
          </div>
        </FadeUp>

        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          <PathwayStageCard
            title="Watch List"
            requirement="Top 10% of your age group + 20 races in 90 days"
            status={watchStatus}
            delay={0}
          />
          <div className="hidden lg:flex items-center text-[#CB3C33] text-xl font-bold shrink-0">→</div>
          <div className="lg:hidden flex justify-center text-[#CB3C33] text-xl font-bold">↓</div>
          <PathwayStageCard
            title="Talent Pool"
            requirement="Top 3% + Safety Rating ≥ 3.0 + 3 different tracks"
            status={poolStatus}
            delay={80}
          />
          <div className="hidden lg:flex items-center text-[#CB3C33] text-xl font-bold shrink-0">→</div>
          <div className="lg:hidden flex justify-center text-[#CB3C33] text-xl font-bold">↓</div>
          <PathwayStageCard
            title="Qualifier Event"
            requirement="By invitation — top Talent Pool drivers only"
            status={qualStatus}
            delay={160}
          />
        </div>
      </section>

      {/* ── SECTION 5: Quick Actions ───────────────────────────────────────── */}
      <section className="space-y-6">
        <FadeUp delay={0}>
          <h2 className="text-lg font-bold text-white">What to do next</h2>
        </FadeUp>

        <div className="flex flex-col lg:flex-row gap-4">
          <ActionCard
            title="View Your Score"
            description="See your full Talent Score breakdown and iRating progression."
            buttonLabel="Go to Overview →"
            href="/dashboard"
            delay={0}
          />
          <ActionCard
            title="Check Your Ranking"
            description="See where you stand among drivers in your age group."
            buttonLabel="View Ranking →"
            href="/dashboard/ranking"
            delay={80}
          />
          <ActionCard
            title="Track Your Pathway"
            description="See exactly what you need to reach the next scouting level."
            buttonLabel="View Pathway →"
            href="/dashboard/pathway"
            delay={160}
          />
        </div>
      </section>
    </div>
  );
}
