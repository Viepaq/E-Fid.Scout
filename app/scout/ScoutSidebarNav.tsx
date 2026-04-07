'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

type NavItem = {
  label: string;
  href: string;
  filterValue?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Talent Overview', href: '/scout' },
  { label: 'Watch List',      href: '/scout?filter=watchlist',   filterValue: 'watchlist' },
  { label: 'Talent Pool',     href: '/scout?filter=talent_pool', filterValue: 'talent_pool' },
];

export default function ScoutSidebarNav({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentFilter = searchParams.get('filter');

  function isActive(item: NavItem): boolean {
    if (pathname !== '/scout') return false;
    if (!item.filterValue) return !currentFilter;
    return currentFilter === item.filterValue;
  }

  function desktopLinkClass(item: NavItem) {
    const active = isActive(item);
    return [
      'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors border-l-2',
      active
        ? 'text-[#22c55e] border-[#22c55e] bg-[#22c55e]/5'
        : 'text-[#888888] border-transparent hover:text-white hover:bg-white/5',
    ].join(' ');
  }

  function mobileLinkClass(item: NavItem) {
    const active = isActive(item);
    return [
      'flex items-center min-h-[44px] px-4 rounded-lg text-base font-medium transition-colors',
      active
        ? 'text-[#22c55e] bg-[#22c55e]/10'
        : 'text-[#888888] hover:text-white hover:bg-white/5',
    ].join(' ');
  }

  function handleSignOut() {
    window.location.assign('/auth/sign-out');
  }

  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ─────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 h-screen flex-col bg-[#111111] border-r border-[#222222]">
        <div className="px-6 py-5 border-b border-[#222222]">
          <span className="text-[20px] font-bold tracking-tight leading-none">
            <span className="text-white">Scout</span>
            <span className="text-[#22c55e]"> Dashboard</span>
          </span>
          <p className="text-[#444] text-xs mt-1">Talent Scout Dashboard</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={desktopLinkClass(item)}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-[#222222] space-y-2">
          <p className="text-xs text-[#888888] truncate px-1" title={displayName}>
            {displayName}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar (fixed) ──────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-[#111111] border-b border-[#222222]">
        <span className="text-[16px] font-bold tracking-tight leading-none">
          <span className="text-white">Scout</span>
          <span className="text-[#22c55e]"> Dashboard</span>
        </span>
        <button
          onClick={() => setMobileOpen(true)}
          className="w-11 h-11 flex items-center justify-center text-[#888888] hover:text-white transition-colors"
          aria-label="Open navigation menu"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </div>

      {/* ── Mobile overlay menu ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm flex flex-col"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileOpen(false);
          }}
        >
          <div className="flex items-center justify-between px-4 h-14 bg-[#111111] border-b border-[#222222]">
            <span className="text-[16px] font-bold tracking-tight leading-none">
              <span className="text-white">Scout</span>
              <span className="text-[#22c55e]"> Dashboard</span>
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              className="w-11 h-11 flex items-center justify-center text-[#888888] hover:text-white transition-colors"
              aria-label="Close navigation menu"
            >
              <svg
                width="20"
                height="20"
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

          <nav className="flex-1 px-4 py-6 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={mobileLinkClass(item)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="px-4 py-6 border-t border-[#222222] space-y-3">
            <p className="text-xs text-[#888888] truncate px-1" title={displayName}>
              {displayName}
            </p>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                handleSignOut();
              }}
              className="w-full flex items-center min-h-[44px] px-4 rounded-lg text-base text-[#888888] hover:text-white hover:bg-white/5 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
