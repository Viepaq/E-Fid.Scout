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

// ─── Fade-up animation ────────────────────────────────────────────────────────
function useFadeUp(ref: React.RefObject<HTMLElement | null>, delay = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`;
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

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFadeUp(ref as React.RefObject<HTMLElement>, delay);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ value }: { value: number | null }) {
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const filled = value !== null ? (value / 100) * circ : 0;

  return (
    <div className="flex flex-col items-center gap-3 shrink-0">
      <div className="relative w-36 h-36">
        {/* viewBox padded so drop-shadow isn't clipped */}
        <svg className="w-full h-full -rotate-90" viewBox="-8 -8 136 136">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="7" />
          {value !== null && (
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke="#e8143c"
              strokeWidth="7"
              strokeDasharray={`${filled} ${circ}`}
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 4px rgba(232,20,60,0.6))' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-[34px] font-black text-white leading-none">
            {value ?? '—'}
          </span>
          <span className="text-[9px] text-slate-500 uppercase tracking-[0.14em]">Score</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-bold text-[#e8143c] uppercase tracking-[0.15em]">Talent Score</p>
        <p className="text-[10px] text-slate-700 mt-0.5">Updated every 24h</p>
      </div>
    </div>
  );
}

// ─── Score tier ───────────────────────────────────────────────────────────────
function scoreTier(value: number): { label: string; colorCls: string } {
  if (value >= 80) return { label: 'Elite',       colorCls: 'text-[#e8143c]' };
  if (value >= 60) return { label: 'Strong',      colorCls: 'text-[#f59e0b]' };
  if (value >= 40) return { label: 'Competitive', colorCls: 'text-blue-400' };
  return              { label: 'Developing',  colorCls: 'text-slate-500' };
}

// ─── Pathway status ───────────────────────────────────────────────────────────
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

function SectionLabel({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <FadeUp delay={0}>
      <div className="space-y-1 mb-6">
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.15em] font-semibold">{eyebrow}</p>
        <h2 className="text-xl font-extrabold text-white">{title}</h2>
        {sub && <p className="text-sm text-slate-500">{sub}</p>}
      </div>
    </FadeUp>
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
    <FadeUp
      delay={delay}
      className="relative bg-[#13131e] border border-white/[0.07] rounded-2xl p-6 overflow-hidden hover:border-[#e8143c]/25 hover:bg-[#1a1a28] transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.4)] group"
    >
      <span className="absolute top-4 right-5 text-[64px] font-black text-white/[0.03] leading-none select-none group-hover:text-[#e8143c]/[0.05] transition-colors">
        {number}
      </span>
      <div className="relative z-10 space-y-3">
        <div className="w-9 h-9 rounded-xl bg-[#e8143c]/10 border border-[#e8143c]/20 flex items-center justify-center text-[#e8143c]">
          {icon}
        </div>
        <p className="font-bold text-white text-sm">{title}</p>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
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

  const barColor =
    value !== null && value >= 80 ? 'bg-[#e8143c] shadow-[0_0_10px_rgba(232,20,60,0.4)]' :
    value !== null && value >= 60 ? 'bg-[#f59e0b]' :
    value !== null && value >= 40 ? 'bg-blue-500' :
    'bg-slate-600';

  return (
    <FadeUp delay={delay} className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 space-y-3 hover:border-[#e8143c]/25 hover:bg-[#1a1a28] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-semibold">{label}</p>
      <p className="text-[40px] font-black text-white leading-none">{value ?? '?'}</p>
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700`}
          style={{ width: value !== null ? `${value}%` : '0%' }}
        />
      </div>
      <p className="text-[11px] text-slate-600 leading-snug">{description}</p>
      {tier && (
        <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${tier.colorCls}`}>
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
  const borderCls =
    status === 'current'
      ? 'border-[#e8143c]/40 bg-[#e8143c]/[0.04]'
      : status === 'completed'
        ? 'border-[#22c55e]/25 bg-[#22c55e]/[0.03]'
        : 'border-white/[0.07]';

  const badge =
    status === 'current'
      ? { label: 'Current',   cls: 'text-[#e8143c] bg-[#e8143c]/10 border-[#e8143c]/25' }
      : status === 'completed'
        ? { label: '✓ Done',  cls: 'text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20' }
        : null;

  return (
    <FadeUp delay={delay} className={`flex-1 bg-[#13131e] rounded-2xl p-5 space-y-3 border ${borderCls} transition-all`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-white text-sm">{title}</p>
        {badge && (
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>
      <p className="text-slate-500 text-sm leading-relaxed">{requirement}</p>
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
    <FadeUp delay={delay} className="flex-1 bg-[#13131e] border border-white/[0.07] rounded-2xl p-6 flex flex-col gap-4 hover:border-[#e8143c]/25 hover:bg-[#1a1a28] transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="space-y-1.5 flex-1">
        <p className="font-bold text-white text-sm">{title}</p>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center justify-center gap-1.5 border border-[#e8143c]/35 text-[#e8143c] text-[11px] font-bold uppercase tracking-[0.12em] px-4 py-2.5 rounded-xl transition-all duration-200 hover:bg-[#e8143c] hover:text-white hover:border-[#e8143c] hover:shadow-[0_0_16px_rgba(232,20,60,0.3)]"
      >
        {buttonLabel}
      </Link>
    </FadeUp>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GetStartedClient({ displayName, score, scoutingStatus }: Props) {
  const watchStatus = pathwayStageStatus('watchlist', scoutingStatus);
  const poolStatus  = pathwayStageStatus('talent_pool', scoutingStatus);
  const qualStatus  = pathwayStageStatus('qualifier_invited', scoutingStatus);

  return (
    <div className="max-w-6xl space-y-10 px-4 py-6 lg:px-8 lg:py-8">

      {/* ── SECTION 1: Hero ────────────────────────────────────────────────── */}
      <FadeUp delay={0}>
        <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-[#13131e] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,20,60,0.10)_0%,transparent_60%)] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#e8143c]/[0.04] rounded-full blur-3xl pointer-events-none" />
          {/* Top accent */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#e8143c]/50 to-transparent" />

          <div className="relative flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 p-8 lg:p-10">
            {/* Left */}
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e8143c] animate-pulse shadow-[0_0_6px_rgba(232,20,60,0.7)]" />
                <p className="text-[10px] font-bold text-[#e8143c] uppercase tracking-[0.15em]">
                  Welcome to Kaimann Racing Analytics
                </p>
              </div>
              <h1 className="text-[28px] lg:text-[32px] font-extrabold text-white leading-tight">
                Your path to real-world racing<br className="hidden lg:block" /> starts here.
              </h1>
              <p className="text-[14px] text-slate-500 leading-relaxed max-w-md">
                Kaimann Racing Analytics analyzes your iRacing performance across 5 dimensions and connects
                top talents with real motorsport organizations.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                  Data-driven scouting
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e8143c]" />
                  Real motorsport opportunities
                </span>
              </div>
            </div>
            {/* Right */}
            <div className="shrink-0">
              <ScoreRing value={score?.score_total ?? null} />
            </div>
          </div>
        </div>
      </FadeUp>

      {/* ── SECTION 2: How it works ────────────────────────────────────────── */}
      <section>
        <SectionLabel
          eyebrow="System Overview"
          title="How Kaimann Racing Analytics works"
          sub="Three steps from the simulator to the real track."
        />
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
      <section>
        <SectionLabel
          eyebrow="Performance Metrics"
          title="Your 5 Talent Dimensions"
          sub="Every dimension tells a different part of your story."
        />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <DimensionCard label="Learning Rate" value={score?.score_learning_rate ?? null} description="How fast you improve over time"        delay={0}   />
          <DimensionCard label="Consistency"   value={score?.score_consistency ?? null}   description="How reliable your race results are"   delay={80}  />
          <DimensionCard label="Racecraft"     value={score?.score_racecraft ?? null}     description="How well you perform wheel-to-wheel"  delay={160} />
          <DimensionCard label="Versatility"   value={score?.score_versatility ?? null}   description="How you adapt to different tracks"    delay={240} />
          <DimensionCard label="Activity"      value={score?.score_activity ?? null}      description="How seriously you train and compete"  delay={320} />
        </div>
      </section>

      {/* ── SECTION 4: Scouting Pathway ───────────────────────────────────── */}
      <section>
        <SectionLabel
          eyebrow="Pathway"
          title="The Scouting Pathway"
          sub="Every great driver starts somewhere."
        />
        <div className="flex flex-col lg:flex-row items-stretch gap-3">
          <PathwayStageCard
            title="Watch List"
            requirement="Top 10% of your age group + 20 races in 90 days"
            status={watchStatus}
            delay={0}
          />
          <div className="hidden lg:flex items-center text-[#e8143c]/50 text-xl font-black shrink-0">→</div>
          <div className="lg:hidden flex justify-center text-[#e8143c]/50 text-xl font-black">↓</div>
          <PathwayStageCard
            title="Talent Pool"
            requirement="Top 3% + Safety Rating ≥ 3.0 + 3 different tracks"
            status={poolStatus}
            delay={80}
          />
          <div className="hidden lg:flex items-center text-[#e8143c]/50 text-xl font-black shrink-0">→</div>
          <div className="lg:hidden flex justify-center text-[#e8143c]/50 text-xl font-black">↓</div>
          <PathwayStageCard
            title="Qualifier Event"
            requirement="By invitation — top Talent Pool drivers only"
            status={qualStatus}
            delay={160}
          />
        </div>
      </section>

      {/* ── SECTION 5: Quick Actions ───────────────────────────────────────── */}
      <section>
        <SectionLabel
          eyebrow="Quick Actions"
          title="What to do next"
        />
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
