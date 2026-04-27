'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/lib/database.types';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const RocketIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const TrophyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

const RouteIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/>
    <circle cx="18" cy="5" r="3"/>
  </svg>
);

const ScoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const WaveformIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2,12 6,12 8,4 10,20 12,10 14,15 16,12 22,12"/>
  </svg>
);

const HistoryIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
    <path d="M12 7v5l4 2"/>
  </svg>
);

const SignOutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const BASE_NAV: NavItem[] = [
  { label: 'Get Started', href: '/dashboard/get-started', icon: <RocketIcon /> },
  { label: 'Overview',    href: '/dashboard',             icon: <GridIcon /> },
  { label: 'Ranking',     href: '/dashboard/ranking',     icon: <TrophyIcon /> },
  { label: 'Pathway',     href: '/dashboard/pathway',     icon: <RouteIcon /> },
  { label: 'Telemetry',   href: '/dashboard/telemetry',   icon: <WaveformIcon /> },
  { label: 'Sessions',    href: '/dashboard/sessions',    icon: <HistoryIcon /> },
];

const SCOUT_NAV: NavItem = { label: 'Scout Dashboard', href: '/scout', icon: <ScoutIcon /> };

export default function SidebarNav({
  displayName,
  role,
}: {
  displayName: string;
  role: UserRole;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems =
    role === 'scout' || role === 'admin'
      ? [...BASE_NAV, SCOUT_NAV]
      : BASE_NAV;

  const initials = displayName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  function handleSignOut() {
    window.location.assign('/auth/sign-out');
  }

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
  }

  function desktopLinkClass(href: string) {
    return [
      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150',
      isActive(href)
        ? 'text-white bg-[#e8143c]/[0.12] border border-[#e8143c]/25'
        : 'text-slate-500 border border-transparent hover:text-slate-200 hover:bg-white/[0.05]',
    ].join(' ');
  }

  function mobileLinkClass(href: string) {
    return [
      'flex items-center gap-3 min-h-[48px] px-4 rounded-2xl text-[15px] font-medium transition-all',
      isActive(href)
        ? 'text-white bg-[#e8143c]/[0.12] border border-[#e8143c]/25'
        : 'text-slate-500 border border-transparent hover:text-slate-200 hover:bg-white/[0.05]',
    ].join(' ');
  }

  const Logo = () => (
    <div className="flex items-center gap-2.5">
      <div className="relative w-7 h-7 rounded-lg bg-[#e8143c]/10 border border-[#e8143c]/30 flex items-center justify-center shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-[#e8143c] shadow-[0_0_8px_rgba(232,20,60,0.7)]" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-tight">
          <span className="text-white">Kaimann</span>
          <span className="text-[#e8143c]"> Racing</span>
        </span>
        <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-center mt-0.5"
          style={{ color: '#e8143c', textShadow: '0 0 8px rgba(232,20,60,0.8), 0 0 20px rgba(232,20,60,0.4)' }}>
          Analytics
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[220px] shrink-0 h-screen flex-col bg-[#13131e] border-r border-white/[0.07]">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.07]">
          <Logo />
        </div>

        {/* Nav */}
        <div className="flex-1 px-3 pt-4 pb-2 space-y-0.5">
          <p className="text-[10px] text-slate-700 uppercase tracking-[0.15em] font-semibold px-3 mb-3">
            Menu
          </p>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={desktopLinkClass(item.href)}>
              <span className={isActive(item.href) ? 'text-[#e8143c]' : 'text-slate-600'}>
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {isActive(item.href) && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#e8143c] shadow-[0_0_6px_rgba(232,20,60,0.8)]" />
              )}
            </Link>
          ))}
        </div>

        {/* User */}
        <div className="px-3 py-4 border-t border-white/[0.07]">
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#e8143c]/30 to-[#e8143c]/10 border border-[#e8143c]/30 flex items-center justify-center text-[11px] font-bold text-white">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#22c55e] border-2 border-[#13131e]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-slate-300 font-medium truncate">{displayName}</p>
              <p className="text-[10px] text-slate-600">Driver</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] text-slate-600 hover:text-slate-200 hover:bg-white/[0.05] transition-all border border-transparent"
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-[#13131e]/95 backdrop-blur-md border-b border-white/[0.07]">
        <Logo />
        <button
          onClick={() => setMobileOpen(true)}
          className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors rounded-xl hover:bg-white/[0.05]"
          aria-label="Open navigation menu"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h12M3 18h18" />
          </svg>
        </button>
      </div>

      {/* ── Mobile drawer ───────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-[#0d0d18]/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setMobileOpen(false); }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#13131e] border-r border-white/[0.07] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.07]">
              <Logo />
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors rounded-xl hover:bg-white/[0.05]"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-5 space-y-1">
              <p className="text-[10px] text-slate-700 uppercase tracking-[0.15em] font-semibold px-3 mb-3">Menu</p>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={mobileLinkClass(item.href)}
                >
                  <span className={isActive(item.href) ? 'text-[#e8143c]' : 'text-slate-600'}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive(item.href) && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-[#e8143c] shadow-[0_0_6px_rgba(232,20,60,0.8)]" />
                  )}
                </Link>
              ))}
            </nav>

            {/* User */}
            <div className="px-4 py-5 border-t border-white/[0.07]">
              <div className="flex items-center gap-3 px-1 mb-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e8143c]/30 to-[#e8143c]/10 border border-[#e8143c]/30 flex items-center justify-center text-[13px] font-bold text-white">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22c55e] border-2 border-[#13131e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-slate-300 font-medium truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-600">Driver</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="w-full flex items-center gap-3 min-h-[44px] px-4 rounded-2xl text-[14px] text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-all"
              >
                <SignOutIcon />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
