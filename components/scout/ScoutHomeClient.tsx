'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { AgeGroup, ScoutingStatus } from '@/lib/database.types';

type Stats = {
  totalDrivers: number;
  watchlistCount: number;
  talentPoolCount: number;
  qualifierCount: number;
  avgScore: number;
};

type TopDriver = {
  userId: string;
  displayName: string;
  scoreTotal: number;
  ageGroup: AgeGroup | null;
  status: ScoutingStatus;
};

type Props = {
  scoutName: string;
  stats: Stats;
  topDrivers: TopDriver[];
};

// ─── Fade-up animation ────────────────────────────────────────────────────────
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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = `opacity 500ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ScoutingStatus }) {
  if (status === 'none') return <span className="text-[#555555] text-xs">Tracking</span>;
  const map: Record<string, { cls: string; label: string }> = {
    watchlist:          { cls: 'text-blue-400',    label: 'Watch List' },
    talent_pool:        { cls: 'text-yellow-400',  label: 'Talent Pool' },
    qualifier_invited:  { cls: 'text-[#CB3C33]',   label: 'Qualifier' },
  };
  const s = map[status];
  if (!s) return null;
  return <span className={`text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

// ─── Score dot ────────────────────────────────────────────────────────────────
function ScoreDot({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#888888';
  return (
    <span className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="font-bold text-white tabular-nums">{score}</span>
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ScoutHomeClient({ scoutName, stats, topDrivers }: Props) {
  const firstName = scoutName.split(' ')[0];

  return (
    <div className="max-w-6xl space-y-10 px-4 py-6 lg:p-8">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <FadeUp delay={0}>
        <div
          className="relative rounded-2xl overflow-hidden p-8 lg:p-10"
          style={{
            background: 'linear-gradient(135deg, #0d1a0d 0%, #0a0a0a 60%, #0a0a0a 100%)',
            border: '1px solid #1a2a1a',
          }}
        >
          <div
            className="absolute top-0 right-0 w-80 h-80 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at top right, rgba(34,197,94,0.12) 0%, transparent 65%)',
            }}
          />
          <div className="relative space-y-2 max-w-2xl">
            <p
              className="text-[11px] font-bold uppercase"
              style={{ color: '#22c55e', letterSpacing: '0.18em' }}
            >
              Kaimann Racing · Talent Intelligence
            </p>
            <h1 className="text-[26px] lg:text-[30px] font-extrabold text-white leading-tight">
              Welcome back, {firstName}.
            </h1>
            <p className="text-[14px] text-[#888888] leading-relaxed max-w-xl">
              You have access to{' '}
              <span className="text-white font-semibold">{stats.totalDrivers} registered drivers</span>.
              Use the sidebar to explore talent, filter by age group and score, and track scouting progress.
            </p>
          </div>
        </div>
      </FadeUp>

      {/* ── STATS ROW ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Drivers',  value: stats.totalDrivers,    color: '#ffffff',  delay: 0 },
          { label: 'Avg. Score',     value: stats.avgScore,         color: '#f59e0b',  delay: 60 },
          { label: 'Watch List',     value: stats.watchlistCount,   color: '#3b82f6',  delay: 120 },
          { label: 'Talent Pool',    value: stats.talentPoolCount,  color: '#eab308',  delay: 180 },
          { label: 'Qualifier',      value: stats.qualifierCount,   color: '#22c55e',  delay: 240 },
        ].map(({ label, value, color, delay }) => (
          <FadeUp key={label} delay={delay}>
            <div className="bg-[#111111] border border-[#222222] rounded-xl p-4 space-y-1">
              <p className="text-[11px] text-[#555555] uppercase tracking-widest font-medium">{label}</p>
              <p className="text-3xl font-black" style={{ color }}>{value}</p>
            </div>
          </FadeUp>
        ))}
      </div>

      {/* ── HOW TO USE ────────────────────────────────────────────────────── */}
      <section className="space-y-5">
        <FadeUp delay={0}>
          <div>
            <h2 className="text-lg font-bold text-white">Your scouting toolkit</h2>
            <p className="text-sm text-[#888888] mt-0.5">Everything you need to identify and track racing talent.</p>
          </div>
        </FadeUp>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                </svg>
              ),
              title: 'Talent Overview',
              href: '/scout',
              badge: `${stats.totalDrivers} drivers`,
              badgeCls: 'text-[#22c55e]',
              description:
                'Full ranked table of every registered driver. Filter by age group, scouting status, or minimum score. Click any driver to open their detailed profile.',
              cta: 'Open Overview →',
              delay: 0,
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                </svg>
              ),
              title: 'Watch List',
              href: '/scout?filter=watchlist',
              badge: `${stats.watchlistCount} drivers`,
              badgeCls: 'text-blue-400',
              description:
                'Drivers who have crossed the Watch List threshold — top 10% in their age group with at least 20 races in 90 days. Your priority shortlist.',
              cta: 'View Watch List →',
              delay: 80,
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ),
              title: 'Talent Pool',
              href: '/scout?filter=talent_pool',
              badge: `${stats.talentPoolCount} drivers`,
              badgeCls: 'text-yellow-400',
              description:
                'Elite tier — top 3% of their age group, Safety Rating ≥ 3.0, and proven versatility across 3+ tracks. These are your real-world candidates.',
              cta: 'View Talent Pool →',
              delay: 160,
            },
          ].map(({ icon, title, href, badge, badgeCls, description, cta, delay }) => (
            <FadeUp key={title} delay={delay}>
              <div className="h-full bg-[#111111] border border-[#222222] rounded-xl p-6 flex flex-col gap-4 hover:border-[#333333] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#22c55e]">
                      {icon}
                    </div>
                    <p className="font-bold text-white text-sm">{title}</p>
                  </div>
                  <span className={`text-xs font-semibold ${badgeCls}`}>{badge}</span>
                </div>
                <p className="text-[13px] text-[#777777] leading-relaxed flex-1">{description}</p>
                <Link
                  href={href}
                  className="text-[13px] font-medium border border-[#22c55e]/40 text-[#22c55e] px-4 py-2 rounded-lg text-center transition-all duration-200 hover:bg-[#22c55e] hover:text-black hover:border-[#22c55e]"
                >
                  {cta}
                </Link>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── TOP 5 PERFORMERS ─────────────────────────────────────────────── */}
      {topDrivers.length > 0 && (
        <section className="space-y-5">
          <FadeUp delay={0}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Top performers</h2>
                <p className="text-sm text-[#888888] mt-0.5">Highest-scoring drivers right now.</p>
              </div>
              <Link
                href="/scout"
                className="text-[13px] text-[#22c55e] hover:text-white transition-colors"
              >
                View all →
              </Link>
            </div>
          </FadeUp>

          <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1f1f1f]">
                  {['Rank', 'Driver', 'Score', 'Age Group', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-[#555555] uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {topDrivers.map((d, i) => (
                    <tr
                      key={d.userId}
                      onClick={() => { window.location.href = `/scout/${d.userId}`; }}
                      className="cursor-pointer hover:bg-white/[0.025] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className={`font-bold text-sm ${i < 3 ? 'text-[#22c55e]' : 'text-[#555555]'}`}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                        {d.displayName}
                      </td>
                      <td className="px-4 py-3">
                        <ScoreDot score={d.scoreTotal} />
                      </td>
                      <td className="px-4 py-3 text-[#888888] text-sm">
                        {d.ageGroup ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/scout/${d.userId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-[#22c55e] hover:text-white border border-[#22c55e]/30 hover:border-white/30 rounded px-2 py-1 transition-colors whitespace-nowrap"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── SCOUTING PATHWAY LEGEND ───────────────────────────────────────── */}
      <FadeUp delay={0}>
        <section className="bg-[#111111] border border-[#222222] rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">Scouting Status Guide</h2>
            <p className="text-xs text-[#555555] mt-0.5">How drivers progress through the pipeline</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                color: '#555555',
                label: 'Tracking',
                desc: 'Registered and being monitored. Has not yet met Watch List criteria.',
              },
              {
                color: '#3b82f6',
                label: 'Watch List',
                desc: 'Top 10% of age group. 20+ races in 90 days. Actively watched by scouts.',
              },
              {
                color: '#eab308',
                label: 'Talent Pool',
                desc: 'Top 3% of age group. SR ≥ 3.0. Versatility proven. Real-world candidate.',
              },
              {
                color: '#22c55e',
                label: 'Qualifier',
                desc: 'Invited to a physical qualifier event by Kaimann Racing scouting partners.',
              },
            ].map(({ color, label, desc }) => (
              <div key={label} className="flex gap-3 items-start">
                <span
                  className="mt-0.5 w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div>
                  <p className="text-xs font-semibold text-white">{label}</p>
                  <p className="text-xs text-[#666666] leading-snug mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </FadeUp>

    </div>
  );
}
