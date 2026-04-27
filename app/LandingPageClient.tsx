'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Fragment,
  type ReactNode,
  type CSSProperties,
} from 'react';
import Link from 'next/link';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';

// ─── Accent color ─────────────────────────────────────────────────────────────
const A = '#CB3C33';
const PAGE_BG = '#010101';

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsInView(true); observer.unobserve(el); } },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return { ref, isInView };
}

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);
  const start = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startTime = performance.now();
    function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }
    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1);
      setCount(Math.round(target * easeOutQuart(progress)));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);
  return { count, start };
}

// ─── FadeUp ───────────────────────────────────────────────────────────────────

function FadeUp({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, isInView } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: isInView ? 1 : 0,
      transform: isInView ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPlug() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12M5 12V6a7 7 0 0 1 14 0v6" /><path d="M8 12v-2h8v2" /><circle cx="12" cy="19" r="3" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

// ─── Navbar — floating glass pill ─────────────────────────────────────────────

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 pt-4 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className="flex items-center justify-between px-2 py-1.5 rounded-full"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)',
            }}
          >
            {/* Logo wordmark */}
            <Link href="/" className="px-3 py-1 text-[17px] font-bold tracking-tight leading-none shrink-0">
              <span className="text-white">Kaimann</span>
              <span style={{ color: A }}> Racing Analytics</span>
            </Link>

            {/* Desktop links */}
            <nav className="hidden md:flex items-center gap-0.5">
              {[
                { label: 'How it works', href: '#how' },
                { label: 'Pathway',      href: '#pathway' },
                { label: 'Scoring',      href: '#scoring' },
              ].map((link) => (
                <a key={link.label} href={link.href}
                  className="px-3.5 py-2 text-[13px] font-medium text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/[0.06]">
                  {link.label}
                </a>
              ))}
            </nav>

            {/* CTA group */}
            <div className="flex items-center gap-1.5 pr-0.5">
              <Link href="/login"
                className="hidden sm:inline-flex items-center px-3.5 py-2 text-[13px] font-medium text-white/70 hover:text-white transition-colors rounded-full">
                Sign in
              </Link>
              <Link href="/register"
                className="inline-flex items-center rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:opacity-90"
                style={{ background: '#8B1A14' }}>
                Get Started
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
              className="md:hidden mr-1 w-9 h-9 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(1,1,1,0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setMobileOpen(false); }}>
          <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.08]">
            <span className="text-[17px] font-bold tracking-tight">
              <span className="text-white">Kaimann</span><span style={{ color: A }}> Racing Analytics</span>
            </span>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu"
              className="w-9 h-9 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col px-4 py-6 gap-2">
            <Link href="/login" onClick={() => setMobileOpen(false)}
              className="flex items-center min-h-[48px] px-4 text-base text-white/70 hover:text-white rounded-xl hover:bg-white/[0.06] transition-colors">
              Sign in
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center min-h-[48px] rounded-xl bg-white text-neutral-900 font-bold text-base transition-opacity hover:opacity-90">
              Get Started for Free
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Section helpers (unchanged) ──────────────────────────────────────────────

const PATH_STAGES = [
  { title: 'Watch List',  blurb: 'You race online; scouts start noticing your results.' },
  { title: 'Talent Pool', blurb: 'Strong, repeatable pace — you land on the shortlist.' },
  { title: 'Qualifier',   blurb: 'Events or shootouts — you fight for the next step.' },
  { title: 'Tryout',      blurb: 'Real kart, real track — real-world motorsport evaluation.' },
] as const;

function sectionBackdropStyle(): CSSProperties {
  return {
    borderRadius: '1.25rem',
    background: 'rgba(24, 24, 24, 0.58)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: `
      0 0 0 1px rgba(203, 60, 51, 0.14),
      0 0 48px rgba(203, 60, 51, 0.34),
      0 0 96px rgba(203, 60, 51, 0.18),
      0 0 140px rgba(203, 60, 51, 0.08),
      0 10px 36px rgba(0, 0, 0, 0.42)
    `,
  };
}


function SectionGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div style={{
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(203,60,51,0.22) 0%, rgba(203,60,51,0.10) 45%, transparent 75%)',
        filter: 'blur(40px)',
      }} />
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex flex-col items-center" style={{ backgroundColor: PAGE_BG }}>
      <div className="w-px h-24 lg:h-28" style={{ background: `linear-gradient(to bottom, transparent, rgba(203,60,51,0.5))` }} />
      <div className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ border: '1px solid rgba(203,60,51,0.3)', background: 'rgba(203,60,51,0.08)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: A }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      <div className="w-px h-24 lg:h-28" style={{ background: `linear-gradient(to bottom, rgba(203,60,51,0.5), transparent)` }} />
    </div>
  );
}

function PathwayOverviewSection() {
  return (
    <div className="relative" aria-label="Pathway from simulator to league">
      <div className="w-full">
          <FadeUp>
            <div className="text-center mb-10 lg:mb-14 max-w-2xl mx-auto px-2">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] mb-5" style={{ color: A }}>
                <span className="inline-block w-6 h-px" style={{ background: A }} />
                Your path
                <span className="inline-block w-6 h-px" style={{ background: A }} />
              </p>
              <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">Sim rig → league tryout</h2>
              <p className="mt-7 text-[#949494] text-base lg:text-lg leading-[1.75] max-w-md mx-auto">
                Four levels scouts use to move drivers from the simulator toward real-world opportunities. Talent scoring comes next — this is only the journey.
              </p>
            </div>
          </FadeUp>
          <FadeUp delay={80}>
            <div className="text-center mb-8 lg:mb-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#888]">Progression map</p>
              <div aria-hidden className="mx-auto mt-4 h-px w-16 lg:w-20"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(203,60,51,0.5), transparent)' }} />
            </div>
            <div className="hidden sm:flex w-full items-start gap-4 lg:gap-6">
              {PATH_STAGES.map((s, i) => (
                <Fragment key={s.title}>
                  <div className="min-w-0 flex-1 text-center px-2 lg:px-3">
                    <div className="mx-auto flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full text-base lg:text-lg font-bold tabular-nums text-white"
                      style={{ background: 'rgba(203,60,51,0.14)', boxShadow: 'inset 0 0 0 1px rgba(203,60,51,0.4), 0 8px 24px -8px rgba(203,60,51,0.35)' }}>
                      {i + 1}
                    </div>
                    <p className="mt-6 lg:mt-7 text-base lg:text-lg font-semibold text-white leading-snug">{s.title}</p>
                    <p className="mt-3 text-sm text-[#9a9a9a] leading-relaxed px-0.5 lg:px-1">{s.blurb}</p>
                  </div>
                  {i < PATH_STAGES.length - 1 && (
                    <div className="flex h-12 w-5 shrink-0 items-center justify-center self-start text-[#3a3a3a] opacity-90 lg:h-14 lg:w-6" aria-hidden>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="lg:w-[22px] lg:h-[22px]">
                        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
            <div className="sm:hidden space-y-0 pl-1">
              {PATH_STAGES.map((s, i) => (
                <div key={s.title} className="flex gap-5">
                  <div className="flex flex-col items-center shrink-0 w-12">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white"
                      style={{ background: 'rgba(203,60,51,0.14)', boxShadow: 'inset 0 0 0 1px rgba(203,60,51,0.4), 0 8px 24px -8px rgba(203,60,51,0.3)' }}>
                      {i + 1}
                    </div>
                    {i < PATH_STAGES.length - 1 && (
                      <div className="w-px flex-1 min-h-[28px] my-2"
                        style={{ background: 'linear-gradient(180deg, rgba(203,60,51,0.4), rgba(255,255,255,0.05))' }} />
                    )}
                  </div>
                  <div className={`min-w-0 pt-1 ${i < PATH_STAGES.length - 1 ? 'pb-10' : 'pb-2'}`}>
                    <p className="text-base font-semibold text-white">{s.title}</p>
                    <p className="text-sm text-[#9a9a9a] mt-2 leading-relaxed">{s.blurb}</p>
                  </div>
                </div>
              ))}
            </div>
          </FadeUp>
      </div>
    </div>
  );
}

const STEP_DETAILS = [
  {
    title: 'Connect iRacing',
    bullets: [
      'Enter your iRacing Customer ID — no password ever stored.',
      'We pull your full race history via the official iRacing Data API.',
      'Your data is read-only and stays under your control at all times.',
      'Connect takes under 60 seconds and syncs automatically after each race.',
    ],
    cta: 'Secure OAuth-style handshake. Read-only access.',
  },
  {
    title: 'Get Your Score',
    bullets: [
      'Our algorithm analyses 5 talent dimensions across your entire race history.',
      'Learning curve, consistency, racecraft, versatility and activity are blended into a single 0–100 score.',
      'Scores update automatically after every imported race session.',
      'You can see how each dimension contributes to your overall number.',
    ],
    cta: 'Transparent scoring — no black box.',
  },
  {
    title: 'Get Discovered',
    bullets: [
      'Top-scoring drivers appear in the Kaimann Racing Analytics scout dashboard.',
      'Real motorsport organisations browse by score, track, car and region.',
      'You get notified when a scout views your profile.',
      'Pathway badges show scouts exactly where you are in your journey to real racing.',
    ],
    cta: 'Your talent, visible to the right people.',
  },
] as const;

function StepModal({ index, onClose }: { index: number; onClose: () => void }) {
  const step = STEP_DETAILS[index];
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl p-8 lg:p-10"
        style={{ background: '#111111', border: `1px solid rgba(203,60,51,0.25)`, boxShadow: '0 0 60px rgba(203,60,51,0.15), 0 24px 48px rgba(0,0,0,0.6)', animation: 'fadeInUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={e => e.stopPropagation()}>
        {/* close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[#555] hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
        </button>
        {/* header */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: A }}>Step {index + 1}</p>
        <h3 className="text-2xl font-black text-white mb-6">{step.title}</h3>
        {/* bullets */}
        <ul className="space-y-4 mb-8">
          {step.bullets.map((b, i) => (
            <li key={i} className="flex gap-3 text-[#aaaaaa] text-sm leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: A }} />
              {b}
            </li>
          ))}
        </ul>
        {/* footer note */}
        <p className="text-xs text-[#555555] border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{step.cta}</p>
      </div>
    </div>
  );
}

function StepCard({ number, icon, title, description, index, onOpen }: { number: string; icon: ReactNode; title: string; description: string; index: number; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const borderColor = hovered ? 'rgba(203,60,51,0.4)' : 'rgba(255,255,255,0.08)';
  return (
    <FadeUp delay={index * 100} className="h-full">
      <button className="relative flex flex-col gap-6 p-8 lg:p-10 rounded-2xl h-full overflow-hidden w-full text-left cursor-pointer group"
        style={{ background: '#161616', borderTop: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}`, borderLeft: `2px solid ${A}`, boxShadow: hovered ? '0 0 30px rgba(203,60,51,0.08)' : 'none', transition: 'border-color 300ms, box-shadow 300ms' }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onClick={onOpen}>
        {/* per-card glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{
          background: 'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(203,60,51,0.22) 0%, rgba(203,60,51,0.08) 55%, transparent 80%)',
        }} />
        <span aria-hidden className="absolute -top-2 right-3 select-none pointer-events-none font-black leading-none"
          style={{ fontSize: 'clamp(80px, 10vw, 120px)', color: 'rgba(203,60,51,0.15)', lineHeight: 1 }}>
          {number.padStart(2, '0')}
        </span>
        <div className="flex items-center gap-3 relative z-10">
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'rgba(203,60,51,0.1)', color: A, border: `1px solid rgba(203,60,51,0.25)` }}>
            {number}
          </span>
          <span style={{ color: A }}>{icon}</span>
        </div>
        <div className="relative z-10">
          <h3 className="text-white font-semibold text-xl mb-2">{title}</h3>
          <p className="text-[#888888] text-base leading-relaxed">{description}</p>
        </div>
        {/* learn more hint */}
        <div className="relative z-10 mt-auto flex items-center gap-1.5 text-xs font-medium" style={{ color: A }}>
          Learn more
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
      </button>
    </FadeUp>
  );
}

const DIMENSION_ITEMS = [
  { name: 'Learning',     description: 'Keeps improving race to race—not a one-off fast lap.' },
  { name: 'Consistency',  description: 'Delivers solid finishes instead of random spikes.' },
  { name: 'Racecraft',    description: 'Wheel-to-wheel: passes, defense, staying clean.' },
  { name: 'Versatility',  description: 'Works across cars and tracks, not one favorite only.' },
  { name: 'Activity',     description: 'Races often enough that the score stays up to date.' },
] as const;

function DimensionReveal({ children, index, className = '' }: { children: ReactNode; index: number; className?: string }) {
  const { ref, isInView } = useInView(0.08);
  const d = index * 55;
  return (
    <div ref={ref} className={className} style={{ opacity: isInView ? 1 : 0, transform: isInView ? 'translateY(0)' : 'translateY(14px)', transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${d}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${d}ms` }}>
      {children}
    </div>
  );
}

function DimensionsOverviewSection() {
  return (
    <div className="relative w-full" aria-label="Talent dimensions and scoring">
      <div className="w-full">
          <FadeUp>
            <div className="text-left sm:text-center mb-10 lg:mb-14">
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] mb-5" style={{ color: A }}>
                <span className="inline-block w-6 h-px" style={{ background: A }} />
                What we measure
                <span className="inline-block w-6 h-px" style={{ background: A }} />
              </p>
              <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">Five pieces, one number</h2>
              <p className="mt-5 text-[#9a9a9a] text-base leading-relaxed max-w-lg sm:max-w-xl sm:mx-auto">
                Your races feed five simple checks. We blend them into a single{' '}
                <span className="text-white/90 font-medium">0–100</span> talent score — like ingredients into one recipe. Scouts see the headline first; each piece stays visible in the detail view.
              </p>
            </div>
          </FadeUp>
          <DimensionReveal index={0} className="mb-10 lg:mb-12">
            <div className="flex flex-col items-center gap-4 rounded-xl bg-white/[0.04] px-5 py-6 sm:px-8 sm:py-7">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#5a5a5a]">At a glance</p>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {DIMENSION_ITEMS.map((d, i) => (
                  <span key={d.name} className="dim-ingredient-dot h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
                    style={{ background: A, animation: `dim-dot-breathe 3s ease-in-out infinite`, animationDelay: `${i * 0.22}s` }} title={d.name} />
                ))}
                <span className="dim-merge-arrow mx-1 sm:mx-2 text-[#444]" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-sm font-semibold tabular-nums text-white dim-score-pill" style={{ backgroundColor: PAGE_BG }}>0–100</span>
              </div>
            </div>
          </DimensionReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DIMENSION_ITEMS.map((d, i) => (
              <DimensionReveal key={d.name} index={i + 1} className={i === 4 ? 'sm:col-span-2 sm:max-w-md sm:mx-auto w-full' : ''}>
                <div className="h-full rounded-xl bg-white/[0.04] px-5 py-5 lg:px-6 lg:py-5 transition-colors duration-300 hover:bg-white/[0.06]">
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full dim-tile-dot"
                      style={{ background: A, boxShadow: `0 0 10px ${A}55`, animationDelay: `${i * 0.45}s` }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{d.name}</p>
                      <p className="text-sm text-[#8c8c8c] mt-1.5 leading-relaxed">{d.description}</p>
                    </div>
                  </div>
                </div>
              </DimensionReveal>
            ))}
          </div>
      </div>
    </div>
  );
}

function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, isInView } = useInView(0.3);
  const { count, start } = useCountUp(value, 1500);
  useEffect(() => { if (isInView) start(); }, [isInView, start]);
  return (
    <div ref={ref} className="text-center space-y-3" style={{ opacity: isInView ? 1 : 0, transform: isInView ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)' }}>
      <div className="text-7xl lg:text-9xl font-black tabular-nums inline-flex items-baseline justify-center gap-x-1.5 sm:gap-x-2" style={{ color: A }}>
        <span>{count}</span>{suffix ? <span className="tracking-tight">{suffix}</span> : null}
      </div>
      <div className="text-[#555] mt-2" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.2em' }}>{label}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPageClient() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  return (
    <>
      {activeStep !== null && <StepModal index={activeStep} onClose={() => setActiveStep(null)} />}
      <style>{`
        @keyframes chevron-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
        .chevron-bounce { animation: chevron-bounce 1.6s ease-in-out infinite; }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cta-pulse {
          0%  { box-shadow:0 0 0 0   rgba(203,60,51,0.4); }
          70% { box-shadow:0 0 0 12px rgba(203,60,51,0);  }
          100%{ box-shadow:0 0 0 0   rgba(203,60,51,0);   }
        }
        .btn-pulse { animation: cta-pulse 2s ease-in-out infinite; }
        @keyframes dim-dot-breathe { 0%,100%{transform:scale(1);opacity:0.45} 50%{transform:scale(1.35);opacity:1} }
        @keyframes dim-merge-nudge { 0%,100%{transform:translateX(0);opacity:0.45} 50%{transform:translateX(4px);opacity:0.95} }
        .dim-merge-arrow { animation: dim-merge-nudge 2.5s ease-in-out infinite; }
        @keyframes dim-score-glow { 0%,100%{box-shadow:0 0 0 0 rgba(203,60,51,0)} 50%{box-shadow:0 0 18px -2px rgba(203,60,51,0.22)} }
        .dim-score-pill { animation: dim-score-glow 3.2s ease-in-out infinite; }
        @keyframes dim-tile-dot-pulse { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
        .dim-tile-dot { animation: dim-tile-dot-pulse 4s ease-in-out infinite; }
        @keyframes section-flow-nudge { 0%,100%{transform:translateY(0);opacity:0.65} 50%{transform:translateY(5px);opacity:1} }
        .section-flow-arrow { animation: section-flow-nudge 2.4s ease-in-out infinite; }
        @keyframes hero-fade-up { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        .hero-1 { animation: hero-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .hero-2 { animation: hero-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
        .hero-3 { animation: hero-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.36s both; }
        .hero-4 { animation: hero-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) 0.50s both; }
        @media (prefers-reduced-motion: reduce) {
          .dim-ingredient-dot,.dim-merge-arrow,.dim-score-pill,.dim-tile-dot,.section-flow-arrow { animation:none!important; }
          .hero-1,.hero-2,.hero-3,.hero-4 { animation:none!important; }
        }
      `}</style>

      <div className="text-white min-h-screen" style={{ backgroundColor: PAGE_BG }}>
        <Navbar />

        {/* ── Hero — full-bleed image + glass UI ────────────────────────────── */}
        <section className="relative w-full isolate min-h-screen min-h-[100dvh] overflow-hidden flex flex-col items-center justify-center text-center px-4">

          {/* Background image */}
          <img src="/Landingp2.png" alt="" aria-hidden
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />

          {/* Subtle vignette — bottom only, keeps image clean at top */}
          <div aria-hidden className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(1,1,1,0.55) 0%, transparent 50%)' }} />

          {/* Hero content */}
          <div className="relative z-10 max-w-3xl w-full space-y-6"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8), 0 2px 28px rgba(0,0,0,0.5)' }}>

            {/* H1 */}
            <h1 className="hero-2 text-4xl sm:text-5xl lg:text-[3.75rem] font-black leading-[1.08] tracking-tight">
              The next racing talent
              <br />
              <span style={{ color: A }}>is in a simulator.</span>
            </h1>

            {/* Sub */}
            <p className="hero-3 text-lg sm:text-xl text-white/75 max-w-xl mx-auto leading-relaxed" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
              Kaimann Racing Analytics analyzes your iRacing performance and opens the door to real-world motorsport.
            </p>

            {/* CTAs */}
            <div className="hero-4 flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/register"
                className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/20"
                style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18)' }}>
                Get Started for Free
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Scroll chevron */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-white/40">
            <div className="chevron-bounce">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </section>

        {/* ── Dashboard scroll preview ─────────────────────────────────────── */}
        <div style={{ backgroundColor: PAGE_BG }} className="-mb-[6rem] md:-mb-[8rem]">
          <ContainerScroll
            titleComponent={
              <div className="text-center px-4 pb-4">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] mb-6"
                  style={{ color: '#CB3C33' }}>
                  <span className="inline-block w-6 h-px" style={{ background: '#CB3C33' }} />
                  Your Dashboard
                  <span className="inline-block w-6 h-px" style={{ background: '#CB3C33' }} />
                </p>
                <h2 className="text-5xl sm:text-6xl lg:text-[5rem] xl:text-[5.5rem] font-black leading-[1.05] tracking-tight text-white">
                  Everything
                  <br />
                  <span
                    className="relative inline-block"
                    style={{
                      WebkitTextStroke: '1px rgba(255,255,255,0.15)',
                      color: 'transparent',
                      backgroundImage: `linear-gradient(135deg, #ffffff 15%, rgba(203,60,51,0.95) 100%)`,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      paddingBottom: '0.15em',
                      lineHeight: '1.15',
                    }}
                  >
                    at a glance.
                  </span>
                </h2>
              </div>
            }
          >
            <img
              src="/Screen.png"
              alt="Kaimann Racing Analytics dashboard preview"
              className="w-full h-full object-cover object-top rounded-xl"
              draggable={false}
            />
          </ContainerScroll>
        </div>

        <FlowConnector />

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section id="how" className="relative px-5 lg:px-10 py-12 lg:py-20" style={{ backgroundColor: PAGE_BG }}>
          <div className="max-w-5xl mx-auto">
            <FadeUp>
              <div className="text-center mb-16">
                <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] mb-5" style={{ color: A }}>
                  <span className="inline-block w-6 h-px" style={{ background: A }} />
                  The Process
                  <span className="inline-block w-6 h-px" style={{ background: A }} />
                </p>
                <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white">How it works</h2>
              </div>
            </FadeUp>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <StepCard number="1" icon={<IconPlug />} title="Connect iRacing" description="Securely connect your iRacing account. Your data, always under your control." index={0} onOpen={() => setActiveStep(0)} />
              <StepCard number="2" icon={<IconChart />} title="Get Your Score" description="Our algorithm analyzes your full race history across 5 dimensions of talent." index={1} onOpen={() => setActiveStep(1)} />
              <StepCard number="3" icon={<IconTrophy />} title="Get Discovered" description="Top performers get noticed by real motorsport organizations — and earn their shot at the real thing." index={2} onOpen={() => setActiveStep(2)} />
            </div>
          </div>
        </section>

        <FlowConnector />

        {/* ── Pathway ──────────────────────────────────────────────────────── */}
        <section id="pathway" className="relative px-5 lg:px-10 py-12 lg:py-20 overflow-hidden" style={{ backgroundColor: PAGE_BG }}>
          <SectionGlow />
          <div className="relative z-10 max-w-5xl mx-auto">
            <PathwayOverviewSection />
          </div>
        </section>

        <FlowConnector />

        {/* ── Dimensions ───────────────────────────────────────────────────── */}
        <section id="scoring" className="relative px-5 lg:px-10 py-12 lg:py-20 overflow-hidden" style={{ backgroundColor: PAGE_BG }}>
          <SectionGlow />
          <div className="relative z-10 max-w-4xl mx-auto">
            <DimensionsOverviewSection />
          </div>
        </section>

        <FlowConnector />

        {/* ── Numbers ──────────────────────────────────────────────────────── */}
        <section className="relative px-5 lg:px-10 py-12 lg:py-20 overflow-hidden" style={{ backgroundColor: PAGE_BG }}>
          <div className="relative z-10 max-w-5xl mx-auto">
            <FadeUp>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-16 sm:gap-8 text-center">
                <AnimatedStat value={190} suffix="M+" label="Sim-racers worldwide" />
                <AnimatedStat value={5} suffix="" label="Talent dimensions analyzed" />
                <AnimatedStat value={1} suffix="" label="Clear pathway to real racing" />
              </div>
            </FadeUp>
          </div>
        </section>

        <FlowConnector />

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="relative px-5 lg:px-10 py-12 lg:py-20 text-center overflow-hidden" style={{ backgroundColor: PAGE_BG }}>
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <FadeUp>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Ready to find out how good<br />you really are?
              </h2>
            </FadeUp>
            <FadeUp delay={100}>
              <p className="text-lg text-[#666666] max-w-md mx-auto leading-relaxed">
                Create your free account and get your talent score in minutes.
              </p>
            </FadeUp>
            <FadeUp delay={200}>
              <div className="flex justify-center">
                <Link href="/register"
                  className="btn-pulse flex w-full sm:w-auto items-center justify-center gap-2 text-white font-bold text-lg px-10 py-4 rounded-full transition-opacity hover:opacity-90"
                  style={{ background: A }}>
                  Get Started — It&apos;s Free
                </Link>
              </div>
            </FadeUp>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="py-8 px-4 lg:px-6" style={{ backgroundColor: PAGE_BG }}>
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-lg font-bold tracking-tight">
              <span className="text-white">Kaimann</span><span style={{ color: A }}> Racing Analytics</span>
            </span>
            <div className="text-center space-y-0.5">
              <p className="text-sm text-[#555]">© 2026 Kaimann Racing Analytics</p>
              <p className="text-[#3a3a3a]" style={{ fontSize: '11px', letterSpacing: '0.04em' }}>Built for the next generation of racing talent.</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-[#555]">
              <Link href="/register" className="hover:text-white transition-colors">Register</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
