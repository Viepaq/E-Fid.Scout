import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import Link from 'next/link';
import type { UserRole } from '@/lib/database.types';

export default async function SelectPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const db = createServiceClient();
  const { data: profile } = await db
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single();

  const displayName = (profile as { display_name: string; role: UserRole } | null)?.display_name ?? 'Driver';
  const role        = (profile as { display_name: string; role: UserRole } | null)?.role ?? 'user';
  const isScout     = role === 'scout' || role === 'admin';
  const firstName   = displayName.split(' ')[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <div className="mb-10 text-center">
        <span className="text-2xl font-bold tracking-tight">
          <span className="text-white">FID</span>
          <span className="text-[#e8143c]">-Scout</span>
        </span>
        <p className="text-[#555] text-sm mt-1">Sim Racing Talent Platform</p>
      </div>

      {/* Greeting */}
      <div className="text-center mb-10 space-y-1">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {firstName}.
        </h1>
        <p className="text-sm text-[#666]">
          Choose where you want to go.
        </p>
      </div>

      {/* Cards */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">

        {/* Driver Dashboard */}
        <Link
          href="/dashboard"
          className="group flex-1 bg-[#111111] border border-[#222222] hover:border-[#e8143c]/60 rounded-2xl p-7 flex flex-col gap-4 transition-all duration-200 hover:shadow-[0_0_32px_-8px_rgba(232,20,60,0.25)]"
        >
          <div className="w-11 h-11 rounded-xl bg-[#e8143c]/10 border border-[#e8143c]/20 flex items-center justify-center text-[#e8143c] group-hover:bg-[#e8143c]/15 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="5" />
              <path d="M3 21v-2a7 7 0 0 1 14 0v2" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <p className="font-bold text-white text-[15px]">Driver Dashboard</p>
            <p className="text-[13px] text-[#666] leading-relaxed">
              View your Talent Score, iRating progress, race history and scouting pathway.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[#e8143c] text-sm font-medium mt-auto">
            Enter
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Scout Dashboard */}
        {isScout ? (
          <Link
            href="/scout/home"
            className="group flex-1 bg-[#111111] border border-[#222222] hover:border-[#22c55e]/60 rounded-2xl p-7 flex flex-col gap-4 transition-all duration-200 hover:shadow-[0_0_32px_-8px_rgba(34,197,94,0.2)]"
          >
            <div className="w-11 h-11 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-[#22c55e] group-hover:bg-[#22c55e]/15 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <p className="font-bold text-white text-[15px]">Scout Dashboard</p>
              <p className="text-[13px] text-[#666] leading-relaxed">
                Browse all drivers, filter by talent score and age group, track scouting status.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[#22c55e] text-sm font-medium mt-auto">
              Enter
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ) : (
          <div className="flex-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-7 flex flex-col gap-4 opacity-50 cursor-not-allowed select-none">
            <div className="w-11 h-11 rounded-xl bg-[#1a1a1a] border border-[#222222] flex items-center justify-center text-[#444]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="font-bold text-[#555] text-[15px]">Scout Dashboard</p>
                <span className="text-[10px] font-bold text-[#444] uppercase tracking-widest border border-[#333] rounded px-1.5 py-0.5">
                  Scouts only
                </span>
              </div>
              <p className="text-[13px] text-[#444] leading-relaxed">
                Access restricted to authorised talent scouts.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sign out */}
      <a
        href="/auth/sign-out"
        className="mt-10 text-xs text-[#444] hover:text-[#888] transition-colors"
      >
        Sign out
      </a>
    </div>
  );
}
