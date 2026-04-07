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

// ─── Accent color ─────────────────────────────────────────────────────────────
const A = '#CB3C33'; // primary accent — used throughout

/** Page canvas — rgb(1, 1, 1) */
const PAGE_BG = '#010101';

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
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

    function easeOutQuart(t: number) {
      return 1 - Math.pow(1 - t, 4);
    }

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

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, isInView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 600ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPlug() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22V12M5 12V6a7 7 0 0 1 14 0v6" />
      <path d="M8 12v-2h8v2" />
      <circle cx="12" cy="19" r="3" />
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
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          background: scrolled ? 'rgba(1,1,1,0.92)' : 'transparent',
          borderBottom: scrolled
            ? '1px solid rgba(255,255,255,0.08)'
            : '1px solid transparent',
          transition: 'background 350ms ease, border-color 350ms ease',
        }}
        className="flex items-center justify-between px-4 lg:px-8 py-4"
      >
        <span className="text-lg font-bold tracking-tight">
          <span className="text-white">FID</span>
          <span style={{ color: A }}>-Scout</span>
        </span>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-[#888888] hover:text-white transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            style={{ background: A }}
            className="text-sm text-white font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden w-11 h-11 flex items-center justify-center text-[#888888] hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </nav>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(1,1,1,0.97)', backdropFilter: 'blur(12px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
        >
          <div
            className="flex items-center justify-between px-4 h-14"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-lg font-bold tracking-tight">
              <span className="text-white">FID</span>
              <span style={{ color: A }}>-Scout</span>
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-11 h-11 flex items-center justify-center text-[#888888] hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col px-4 py-6 gap-2">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center min-h-[44px] px-4 text-base text-[#888888] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              style={{ background: A }}
              className="flex items-center justify-center min-h-[44px] text-white font-semibold rounded-lg transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Pathway — sim → league (light “level” framing; scoring is in Dimensions) ─

const PATH_STAGES = [
  {
    title: 'Watch List',
    blurb: 'You race online; scouts start noticing your results.',
  },
  {
    title: 'Talent Pool',
    blurb: 'Strong, repeatable pace — you land on the shortlist.',
  },
  {
    title: 'Qualifier',
    blurb: 'Events or shootouts — you fight for the next step.',
  },
  {
    title: 'Tryout',
    blurb: 'Real kart, real track — real-world motorsport evaluation.',
  },
] as const;

/** Light panel behind section copy + soft red ambient (no heavy “card” chrome). */
function sectionBackdropStyle(): CSSProperties {
  return {
    borderRadius: '1.25rem',
    background: 'rgba(24, 24, 24, 0.58)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    // Omnidirectional red halo (no negative spread / no y-offset) so top/bottom match sides; parents must not clip (overflow visible).
    boxShadow: `
      0 0 0 1px rgba(203, 60, 51, 0.14),
      0 0 48px rgba(203, 60, 51, 0.34),
      0 0 96px rgba(203, 60, 51, 0.18),
      0 0 140px rgba(203, 60, 51, 0.08),
      0 10px 36px rgba(0, 0, 0, 0.42)
    `,
  };
}

type FlowDividerVariant = 'process-pathway' | 'pathway-dimensions' | 'dimensions-numbers' | 'numbers-cta';

/** min-h = adjacent sections’ former pb + pt + h-11 chevron row; grid 1fr / auto / 1fr centers the icon. */
const FLOW_DIVIDER_MIN_H: Record<FlowDividerVariant, string> = {
  'process-pathway': 'min-h-[11.75rem] lg:min-h-[15.75rem] xl:min-h-[17.75rem]',
  'pathway-dimensions': 'min-h-[11.75rem] lg:min-h-[15.75rem] xl:min-h-[17.75rem]',
  'dimensions-numbers': 'min-h-[11.75rem] lg:min-h-[14.75rem] xl:min-h-[15.75rem]',
  'numbers-cta': 'min-h-[10.75rem] lg:min-h-[13.75rem] xl:min-h-[13.75rem]',
};

function SectionFlowDivider({ variant }: { variant: FlowDividerVariant }) {
  return (
    <div
      className={`grid w-full justify-items-center px-5 pointer-events-none ${FLOW_DIVIDER_MIN_H[variant]}`}
      style={{ gridTemplateRows: '1fr auto 1fr' }}
      aria-hidden
    >
      <div />
      <div
        className="section-flow-arrow flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.1] shadow-[0_12px_36px_-12px_rgba(0,0,0,0.65)]"
        style={{ backgroundColor: PAGE_BG }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: A }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      <div />
    </div>
  );
}

function PathwayOverviewSection() {
  return (
    <section
      className="relative px-5 lg:px-10 pt-0 pb-0"
      style={{ background: 'transparent' }}
      aria-label="Pathway from simulator to league"
    >
      {/* Ambient wash — centered lower so the seam under “Process” stays neutral */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[52%] w-[min(92vw,820px)] h-[min(70vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-85"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(203,60,51,0.09) 0%, transparent 68%)',
          filter: 'blur(2px)',
        }}
      />

      <svg
        aria-hidden
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.022]"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%)',
        }}
      >
        <defs>
          <pattern id="pathway-grid" width="64" height="64" patternUnits="userSpaceOnUse">
            <path d="M 64 0 L 0 0 0 64" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pathway-grid)" />
      </svg>

      <div className="max-w-5xl w-full mx-auto relative z-10 px-1 sm:px-2 py-3 sm:py-4">
        <div className="p-6 sm:p-8 lg:p-10 xl:p-12" style={sectionBackdropStyle()}>
          <FadeUp>
            <div className="text-center mb-10 lg:mb-14 max-w-2xl mx-auto px-2">
              <p
                className="text-xs font-semibold uppercase mb-4 tracking-[0.2em]"
                style={{ color: A }}
              >
                Your path
              </p>
              <h2 className="text-[1.75rem] sm:text-4xl lg:text-[2.65rem] font-bold text-white tracking-tight leading-[1.15]">
                Sim rig → league tryout
              </h2>
              <p className="mt-7 text-[#949494] text-base lg:text-lg leading-[1.75] max-w-md mx-auto">
                Four levels scouts use to move drivers from the simulator toward real-world opportunities.
                Talent scoring comes next — this is only the journey.
              </p>
            </div>
          </FadeUp>

          <FadeUp delay={80}>
            <div className="text-center mb-8 lg:mb-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#888]">
                Progression map
              </p>
              <div
                aria-hidden
                className="mx-auto mt-4 h-px w-16 lg:w-20"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(203,60,51,0.5), transparent)',
                }}
              />
            </div>

            {/* Desktop — equal gap between every column + arrow; flex-1 shares width evenly */}
            <div className="hidden sm:flex w-full items-start gap-4 lg:gap-6">
                {PATH_STAGES.map((s, i) => (
                  <Fragment key={s.title}>
                    <div className="min-w-0 flex-1 text-center px-2 lg:px-3">
                      <div
                        className="mx-auto flex h-12 w-12 lg:h-14 lg:w-14 items-center justify-center rounded-full text-base lg:text-lg font-bold tabular-nums text-white"
                        style={{
                          background: 'rgba(203,60,51,0.14)',
                          boxShadow: `
                            inset 0 0 0 1px rgba(203,60,51,0.4),
                            0 8px 24px -8px rgba(203,60,51,0.35)
                          `,
                        }}
                      >
                        {i + 1}
                      </div>
                      <p className="mt-6 lg:mt-7 text-base lg:text-lg font-semibold text-white leading-snug">
                        {s.title}
                      </p>
                      <p className="mt-3 text-sm text-[#9a9a9a] leading-relaxed px-0.5 lg:px-1">
                        {s.blurb}
                      </p>
                    </div>
                    {i < PATH_STAGES.length - 1 && (
                      <div
                        className="flex h-12 w-5 shrink-0 items-center justify-center self-start text-[#3a3a3a] opacity-90 lg:h-14 lg:w-6"
                        aria-hidden
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          className="lg:w-[22px] lg:h-[22px]"
                        >
                          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>

              {/* Mobile */}
              <div className="sm:hidden space-y-0 pl-1">
                {PATH_STAGES.map((s, i) => (
                  <div key={s.title} className="flex gap-5">
                    <div className="flex flex-col items-center shrink-0 w-12">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white"
                        style={{
                          background: 'rgba(203,60,51,0.14)',
                          boxShadow: `
                            inset 0 0 0 1px rgba(203,60,51,0.4),
                            0 8px 24px -8px rgba(203,60,51,0.3)
                          `,
                        }}
                      >
                        {i + 1}
                      </div>
                      {i < PATH_STAGES.length - 1 && (
                        <div
                          className="w-px flex-1 min-h-[28px] my-2"
                          style={{
                            background:
                              'linear-gradient(180deg, rgba(203,60,51,0.4), rgba(255,255,255,0.05))',
                          }}
                        />
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
    </section>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  number,
  icon,
  title,
  description,
  index,
}: {
  number: string;
  icon: ReactNode;
  title: string;
  description: string;
  index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const borderColor = hovered ? 'rgba(203,60,51,0.4)' : 'rgba(255,255,255,0.08)';

  return (
    <FadeUp delay={index * 100} className="h-full">
      <div
        className="relative flex flex-col gap-6 p-8 lg:p-10 rounded-2xl h-full overflow-hidden"
        style={{
          background: '#161616',
          borderTop: `1px solid ${borderColor}`,
          borderRight: `1px solid ${borderColor}`,
          borderBottom: `1px solid ${borderColor}`,
          borderLeft: `2px solid ${A}`,
          boxShadow: hovered ? '0 0 30px rgba(203,60,51,0.08)' : 'none',
          transition: 'border-color 300ms, box-shadow 300ms',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Decorative large step number */}
        <span
          aria-hidden
          className="absolute -top-2 right-3 select-none pointer-events-none font-black leading-none"
          style={{
            fontSize: 'clamp(80px, 10vw, 120px)',
            color: 'rgba(203,60,51,0.15)',
            lineHeight: 1,
          }}
        >
          {number.padStart(2, '0')}
        </span>

        {/* Icon row */}
        <div className="flex items-center gap-3 relative z-10">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{
              background: 'rgba(203,60,51,0.1)',
              color: A,
              border: `1px solid rgba(203,60,51,0.25)`,
            }}
          >
            {number}
          </span>
          <span style={{ color: A }}>{icon}</span>
        </div>

        {/* Text */}
        <div className="relative z-10">
          <h3 className="text-white font-semibold text-xl mb-2">{title}</h3>
          <p className="text-[#888888] text-base leading-relaxed">{description}</p>
        </div>
      </div>
    </FadeUp>
  );
}

// ─── Dimensions — distinct from Pathway: tiles + merge diagram + light motion ─

const DIMENSION_ITEMS = [
  { name: 'Learning', description: 'Keeps improving race to race—not a one-off fast lap.' },
  { name: 'Consistency', description: 'Delivers solid finishes instead of random spikes.' },
  { name: 'Racecraft', description: 'Wheel-to-wheel: passes, defense, staying clean.' },
  { name: 'Versatility', description: 'Works across cars and tracks, not one favorite only.' },
  { name: 'Activity', description: 'Races often enough that the score stays up to date.' },
] as const;

function DimensionReveal({
  children,
  index,
  className = '',
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  const { ref, isInView } = useInView(0.08);
  const d = index * 55;
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(14px)',
        transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${d}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${d}ms`,
      }}
    >
      {children}
    </div>
  );
}

function DimensionsOverviewSection() {
  return (
    <section
      className="relative px-5 lg:px-10 pt-0 pb-0"
      style={{ background: 'transparent' }}
      aria-label="Talent dimensions and scoring"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(203,60,51,0.15) 0%, transparent 45%),
            radial-gradient(circle at 85% 70%, rgba(255,255,255,0.04) 0%, transparent 40%)`,
        }}
      />

      <div className="max-w-4xl w-full mx-auto relative z-10 px-1 sm:px-2 py-3 sm:py-4">
        <div className="p-6 sm:p-8 lg:p-10" style={sectionBackdropStyle()}>
        <FadeUp>
          <div className="text-left sm:text-center mb-10 lg:mb-14">
            <p
              className="text-xs font-semibold uppercase mb-3 tracking-[0.18em]"
              style={{ color: A }}
            >
              What we measure
            </p>
            <h2 className="text-3xl lg:text-[2.35rem] font-bold text-white tracking-tight leading-tight">
              Five pieces, one number
            </h2>
            <p className="mt-5 text-[#9a9a9a] text-base leading-relaxed max-w-lg sm:max-w-xl sm:mx-auto">
              Your races feed five simple checks. We blend them into a single{' '}
              <span className="text-white/90 font-medium">0–100</span> talent score — like ingredients
              into one recipe. Scouts see the headline first; each piece stays visible in the detail view.
            </p>
          </div>
        </FadeUp>

        {/* Merge diagram — different visual language from Pathway progression */}
        <DimensionReveal index={0} className="mb-10 lg:mb-12">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white/[0.04] px-5 py-6 sm:px-8 sm:py-7">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#5a5a5a]">At a glance</p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {DIMENSION_ITEMS.map((d, i) => (
                <span
                  key={d.name}
                  className="dim-ingredient-dot h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
                  style={{
                    background: A,
                    animation: `dim-dot-breathe 3s ease-in-out infinite`,
                    animationDelay: `${i * 0.22}s`,
                  }}
                  title={d.name}
                />
              ))}
              <span className="dim-merge-arrow mx-1 sm:mx-2 text-[#444]" aria-hidden>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span
                className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-sm font-semibold tabular-nums text-white dim-score-pill"
                style={{ backgroundColor: PAGE_BG }}
              >
                0–100
              </span>
            </div>
          </div>
        </DimensionReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DIMENSION_ITEMS.map((d, i) => (
            <DimensionReveal key={d.name} index={i + 1} className={i === 4 ? 'sm:col-span-2 sm:max-w-md sm:mx-auto w-full' : ''}>
              <div className="h-full rounded-xl bg-white/[0.04] px-5 py-5 lg:px-6 lg:py-5 transition-colors duration-300 hover:bg-white/[0.06]">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full dim-tile-dot"
                    style={{
                      background: A,
                      boxShadow: `0 0 10px ${A}55`,
                      animationDelay: `${i * 0.45}s`,
                    }}
                  />
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
    </section>
  );
}

// ─── Animated Stat ────────────────────────────────────────────────────────────

function AnimatedStat({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const { ref, isInView } = useInView(0.3);
  const { count, start } = useCountUp(value, 1500);

  useEffect(() => {
    if (isInView) start();
  }, [isInView, start]);

  return (
    <div
      ref={ref}
      className="text-center space-y-3"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(20px)',
        transition:
          'opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div
        className="text-7xl lg:text-9xl font-black tabular-nums inline-flex items-baseline justify-center gap-x-1.5 sm:gap-x-2"
        style={{ color: A }}
      >
        <span>{count}</span>
        {suffix ? <span className="tracking-tight">{suffix}</span> : null}
      </div>
      <div
        className="text-[#555] mt-2"
        style={{
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPageClient() {
  return (
    <>
      {/* Keyframe definitions */}
      <style>{`
        @keyframes chevron-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(8px); }
        }
        .chevron-bounce {
          animation: chevron-bounce 1.6s ease-in-out infinite;
        }
        @keyframes cta-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(203,60,51,0.4); }
          70%  { box-shadow: 0 0 0 12px rgba(203,60,51,0);   }
          100% { box-shadow: 0 0 0 0   rgba(203,60,51,0);   }
        }
        .btn-pulse {
          animation: cta-pulse 2s ease-in-out infinite;
        }
        @keyframes dim-dot-breathe {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.35); opacity: 1; }
        }
        @keyframes dim-merge-nudge {
          0%, 100% { transform: translateX(0); opacity: 0.45; }
          50% { transform: translateX(4px); opacity: 0.95; }
        }
        .dim-merge-arrow {
          animation: dim-merge-nudge 2.5s ease-in-out infinite;
        }
        @keyframes dim-score-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(203,60,51,0); }
          50% { box-shadow: 0 0 18px -2px rgba(203,60,51,0.22); }
        }
        .dim-score-pill {
          animation: dim-score-glow 3.2s ease-in-out infinite;
        }
        @keyframes dim-tile-dot-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        .dim-tile-dot {
          animation: dim-tile-dot-pulse 4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .dim-ingredient-dot,
          .dim-merge-arrow,
          .dim-score-pill,
          .dim-tile-dot {
            animation: none !important;
          }
          .section-flow-arrow {
            animation: none !important;
          }
        }
        @keyframes section-flow-nudge {
          0%, 100% { transform: translateY(0); opacity: 0.65; }
          50% { transform: translateY(5px); opacity: 1; }
        }
        .section-flow-arrow {
          animation: section-flow-nudge 2.4s ease-in-out infinite;
        }
      `}</style>

      <div className="text-white min-h-screen" style={{ backgroundColor: PAGE_BG }}>
        <Navbar />

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section
          className="relative min-h-screen min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 lg:px-6 pt-16 pb-20 overflow-hidden"
          style={{ backgroundColor: PAGE_BG }}
        >

          {/* Photo background — raw asset, no overlays */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundColor: PAGE_BG,
              backgroundImage: "url('/Landingp2.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />

          {/* Hero content — light text shadow only (does not alter the image) */}
          <div className="relative z-10 max-w-3xl w-full space-y-5 [text-shadow:0_1px_3px_rgba(0,0,0,0.9),0_2px_24px_rgba(0,0,0,0.55)]">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase mb-2"
              style={{
                background: 'rgba(203,60,51,0.08)',
                border: `1px solid rgba(203,60,51,0.4)`,
                color: A,
                letterSpacing: '0.15em',
              }}
            >
              REAL-WORLD MOTORSPORT — TALENT SCOUTING
            </div>

            <h1
              className="text-4xl lg:text-5xl leading-tight tracking-tight"
              style={{ fontWeight: 900 }}
            >
              The next racing talent
              <br />
              <span style={{ color: A }}>is in a simulator.</span>
            </h1>

            <p className="text-lg lg:text-xl text-[#888888] max-w-xl mx-auto leading-relaxed">
              FID-Scout analyzes your iRacing performance and opens the door to real-world motorsport.
            </p>

            <div className="flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-center gap-4 pt-2">
              <Link
                href="/register"
                style={{ background: A }}
                className="flex items-center justify-center gap-2 sm:inline-flex text-white font-bold text-lg px-8 py-4 rounded-xl transition-opacity hover:opacity-90"
              >
                Get Started for Free →
              </Link>
            </div>

            <p className="text-sm text-[#555]">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-[#888888] hover:text-white transition-colors underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Animated scroll chevron */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-white/35">
            <div className="chevron-bounce">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </section>

        {/* ── One continuous story: Process → Path → Dimensions (shared canvas) ─ */}
        <div className="relative" style={{ backgroundColor: PAGE_BG }}>
          <section
            className="flex flex-col items-center justify-start px-5 lg:px-10 pt-14 lg:pt-20 pb-0"
            style={{ background: 'transparent' }}
          >
            <div className="max-w-5xl w-full mx-auto px-1 sm:px-2 py-3 sm:py-4">
              <div className="p-6 sm:p-8 lg:p-10" style={sectionBackdropStyle()}>
                <FadeUp>
                  <div className="text-center mb-10 lg:mb-14">
                    <p
                      className="text-xs font-semibold uppercase mb-4"
                      style={{ color: A, letterSpacing: '0.15em' }}
                    >
                      The Process
                    </p>
                    <h2 className="text-3xl lg:text-5xl font-bold text-white">
                      How it works
                    </h2>
                  </div>
                </FadeUp>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                  <StepCard
                    number="1"
                    icon={<IconPlug />}
                    title="Connect iRacing"
                    description="Securely connect your iRacing account. Your data, always under your control."
                    index={0}
                  />
                  <StepCard
                    number="2"
                    icon={<IconChart />}
                    title="Get Your Score"
                    description="Our algorithm analyzes your full race history across 5 dimensions of talent."
                    index={1}
                  />
                  <StepCard
                    number="3"
                    icon={<IconTrophy />}
                    title="Get Discovered"
                    description="Top performers get noticed by real motorsport organizations — and earn their shot at the real thing."
                    index={2}
                  />
                </div>
              </div>
            </div>
          </section>

          <SectionFlowDivider variant="process-pathway" />

          <PathwayOverviewSection />

          <SectionFlowDivider variant="pathway-dimensions" />

          <DimensionsOverviewSection />

          <SectionFlowDivider variant="dimensions-numbers" />
        </div>

        {/* ── Numbers ─────────────────────────────────────────────────────── */}
        <section
          className="flex flex-col items-center justify-center px-4 lg:px-8 pt-0 pb-16 lg:pb-20"
          style={{ backgroundColor: PAGE_BG }}
        >
          <div className="w-full max-w-6xl xl:max-w-7xl mx-auto px-2 sm:px-3 py-3 sm:py-4">
            <div className="p-8 lg:p-10 xl:p-12" style={sectionBackdropStyle()}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-y-14 sm:gap-y-0 w-full">
              <div className="flex-1 flex justify-center min-w-0">
                <AnimatedStat value={190} suffix="M+" label="Sim-racers worldwide" />
              </div>
              <div className="flex-1 flex justify-center min-w-0">
                <AnimatedStat value={5} suffix="" label="Talent dimensions analyzed" />
              </div>
              <div className="flex-1 flex justify-center min-w-0">
                <AnimatedStat value={1} suffix="" label="Clear pathway to real racing" />
              </div>
            </div>
            </div>
          </div>
        </section>

        <SectionFlowDivider variant="numbers-cta" />

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <section
          className="relative flex flex-col items-center justify-center px-4 lg:px-8 pt-0 pb-16 lg:pb-24 text-center"
          style={{ backgroundColor: PAGE_BG }}
        >
          <div className="max-w-2xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-4 relative z-10">
            <div className="p-8 lg:p-12 space-y-6" style={sectionBackdropStyle()}>
            <FadeUp>
              <h2 className="text-3xl lg:text-5xl font-bold text-white leading-tight">
                Ready to find out how good
                <br />
                you really are?
              </h2>
            </FadeUp>
            <FadeUp delay={100}>
              <p className="text-lg text-[#888888] max-w-md mx-auto leading-relaxed">
                Create your free account and get your talent score in minutes.
              </p>
            </FadeUp>
            <FadeUp delay={200}>
              <div className="flex justify-center">
                <Link
                  href="/register"
                  className="btn-pulse flex w-full sm:w-auto items-center justify-center gap-2 text-white font-bold text-lg px-10 py-4 rounded-xl transition-opacity hover:opacity-90"
                  style={{ background: A }}
                >
                  Get Started — It&apos;s Free
                </Link>
              </div>
            </FadeUp>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="py-8 px-4 lg:px-6" style={{ backgroundColor: PAGE_BG }}>
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-lg font-bold tracking-tight">
              <span className="text-white">FID</span>
              <span style={{ color: A }}>-Scout</span>
            </span>
            <div className="text-center space-y-0.5">
              <p className="text-sm text-[#555]">© 2026 FID-Scout</p>
              <p
                className="text-[#3a3a3a]"
                style={{ fontSize: '11px', letterSpacing: '0.04em' }}
              >
                Built for the next generation of racing talent.
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-[#555]">
              <Link href="/register" className="hover:text-white transition-colors">
                Register
              </Link>
              <Link href="/login" className="hover:text-white transition-colors">
                Sign in
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
