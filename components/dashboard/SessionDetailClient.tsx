'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { IBTResult } from '@/lib/ibt-parser';
import { deleteSession, renameSession } from '@/app/dashboard/sessions/actions';
import AnalysisResultsView, { scoreColor, fmtLapTime } from '@/components/dashboard/AnalysisResultsView';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TelemetryMeta {
  _telemetry: true;
  scores: { smoothness: number; throttleControl: number; brakeEfficiency: number; consistency: number; total: number } | null;
  topSpeed: number | null;
  eventType: string | null;
  driverName: string | null;
}

interface SessionRow {
  id: string;
  track_name: string | null;
  car_name: string | null;
  fastest_lap_ms: number | null;
  incidents: number;
  race_date: string | null;
  series_name: string | null;
  session_label: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMeta(raw: string | null): TelemetryMeta | null {
  if (!raw) return null;
  try { const p = JSON.parse(raw); return p._telemetry ? p : null; } catch { return null; }
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SessionDetailClient({
  session,
  fullResult,
}: {
  session: SessionRow;
  fullResult: IBTResult | null;
}) {
  const router = useRouter();
  const [visible, setVisible]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition]    = useTransition();
  const [renaming, setRenaming]         = useState(false);
  const [labelDraft, setLabelDraft]     = useState(session.session_label ?? '');
  const [currentLabel, setCurrentLabel] = useState(session.session_label ?? '');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);

  const meta        = parseMeta(session.series_name);
  const topSpeed    = fullResult?.analysis.topSpeed ?? meta?.topSpeed ?? null;
  const eventType   = fullResult?.session.eventType ?? meta?.eventType ?? '';
  const driverName  = fullResult?.session.driverName ?? meta?.driverName ?? '';
  const trackDisplay = fullResult?.session.trackDisplayName || fullResult?.session.trackName || session.track_name || 'Unknown Track';
  const trackConfig  = fullResult?.session.trackConfig ?? '';
  const scores      = fullResult?.analysis.scores ?? meta?.scores ?? null;
  const duration    = fullResult?.session.duration;

  const eventBadge = /test/i.test(eventType) ? 'Test'
    : /race/i.test(eventType) ? 'Race'
    : /qual/i.test(eventType) ? 'Qualifying'
    : eventType || 'Session';

  const validLaps = (fullResult?.laps ?? []).filter((l) => l.lapTime > 0);
  const lapStd    = validLaps.length >= 2
    ? Math.sqrt(validLaps.map((l) => l.lapTime).reduce((v, t, _, a) => v + (t - a.reduce((s, x) => s + x, 0) / a.length) ** 2, 0) / validLaps.length)
    : 0;
  const stdColor = lapStd < 1 ? '#22c55e' : lapStd < 2 ? '#f59e0b' : '#e8143c';
  const bestLapSec = fullResult?.session.bestLapTime ?? (session.fastest_lap_ms ? session.fastest_lap_ms / 1000 : -1);

  function startRename() { setLabelDraft(currentLabel); setRenaming(true); setTimeout(() => renameInputRef.current?.focus(), 30); }
  function cancelRename() { setRenaming(false); setLabelDraft(currentLabel); }
  function saveRename() {
    const trimmed = labelDraft.trim();
    setRenaming(false); setCurrentLabel(trimmed);
    startTransition(async () => { await renameSession(session.id, trimmed); });
  }
  function handleDelete() {
    startTransition(async () => { await deleteSession(session.id); router.push('/dashboard/sessions'); router.refresh(); });
  }

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 400ms cubic-bezier(0.16,1,0.3,1), transform 400ms cubic-bezier(0.16,1,0.3,1)',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/[0.06] bg-[#13131e]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(232,20,60,0.06)_0%,transparent_60%)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6">

          {/* Back */}
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-white transition-colors mb-5 font-medium">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            My Sessions
          </button>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8143c]/10 border border-[#e8143c]/20 text-[#e8143c] text-[10px] font-bold uppercase tracking-[0.12em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e8143c] animate-pulse" />
                  {eventBadge}
                </span>
                <span className="text-[11px] text-slate-600">{fmtDate(session.race_date)}</span>
              </div>

              {renaming ? (
                <div className="flex items-center gap-2">
                  <input ref={renameInputRef} value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename(); }}
                    placeholder={trackDisplay}
                    className="bg-[#0d0d18] border border-[#e8143c]/50 rounded-xl px-3 py-2 text-white text-[20px] sm:text-[24px] font-bold outline-none w-full max-w-md" />
                  <button onClick={saveRename} className="shrink-0 px-3 py-2 rounded-xl bg-[#e8143c] text-white text-[12px] font-bold hover:bg-[#c8102f] transition-colors">Save</button>
                  <button onClick={cancelRename} className="shrink-0 px-2 py-2 rounded-xl border border-white/[0.10] text-slate-500 text-[12px] hover:text-white transition-colors">✕</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <h1 className="text-[20px] sm:text-[26px] font-extrabold text-white leading-tight">
                    {currentLabel || trackDisplay}
                  </h1>
                  <button onClick={startRename}
                    className="shrink-0 p-1.5 rounded-xl text-slate-700 hover:text-[#e8143c] hover:bg-[#e8143c]/10 transition-all opacity-0 group-hover/title:opacity-100"
                    title="Rename">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              )}

              {currentLabel && <p className="text-[12px] text-slate-600">{trackDisplay}</p>}
              {(trackConfig || session.car_name) && (
                <p className="text-[13px] text-slate-500">{[trackConfig, session.car_name].filter(Boolean).join(' · ')}</p>
              )}
              {driverName && <p className="text-[12px] text-slate-600">{driverName}</p>}
            </div>

            {/* Stat pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Best Lap',    value: fmtLapTime(bestLapSec), mono: true },
                { label: 'Consistency', value: lapStd > 0 ? `±${lapStd.toFixed(2)}s` : 'N/A', col: lapStd > 0 ? stdColor : undefined },
                { label: 'Incidents',   value: String(session.incidents), red: session.incidents >= 3 },
                { label: 'Duration',    value: duration ? fmtDuration(duration) : '—' },
              ].map(({ label, value, mono, red, col }: any) => (
                <div key={label} className="flex flex-col items-center bg-[#0d0d18] border border-white/[0.07] rounded-2xl px-4 py-3 gap-0.5">
                  <span className={`text-[17px] sm:text-[19px] font-bold leading-none ${red ? 'text-[#e8143c]' : ''} ${mono ? 'font-mono' : ''}`}
                    style={col ? { color: col } : undefined}>
                    {value}
                  </span>
                  <span className="text-[10px] uppercase text-slate-600 tracking-widest font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Full analysis body ────────────────────────────────────────────── */}
      {fullResult ? (
        <>
          <AnalysisResultsView result={fullResult} displayName={driverName} />

          {/* Score summary if scores exist */}
          {scores && (
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
              <div className="flex items-center justify-between bg-[#13131e] border border-white/[0.07] rounded-2xl px-5 py-3">
                <p className="text-[12px] text-slate-600">
                  Overall score:&nbsp;
                  <span className="font-black text-[16px]" style={{ color: scoreColor(scores.total) }}>{scores.total}/100</span>
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 text-center">
          <p className="text-slate-500 text-[14px]">Full telemetry data not available for this session.</p>
          <p className="text-slate-700 text-[12px] mt-1">Sessions saved after the latest update include complete analysis.</p>
          {scores && (
            <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 bg-[#13131e] border border-white/[0.07] rounded-2xl">
              <p className="text-[12px] text-slate-500">Overall score</p>
              <span className="text-[22px] font-black" style={{ color: scoreColor(scores.total) }}>{scores.total}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Danger zone ──────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-white text-[13px] font-semibold">Delete this session</p>
            <p className="text-slate-600 text-[11px] mt-0.5">This cannot be undone.</p>
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl border border-white/[0.10] text-slate-500 text-[12px] hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={isPending}
                className="px-4 py-2 rounded-xl bg-[#e8143c] hover:bg-[#c8102f] text-white text-[12px] font-bold transition-colors disabled:opacity-60 flex items-center gap-2">
                {isPending
                  ? <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>}
                {isPending ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.07] text-slate-500 text-[12px] hover:border-[#e8143c]/40 hover:text-[#e8143c] transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
              Delete session
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
