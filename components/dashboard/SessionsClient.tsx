'use client';

import { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteSession, renameSession } from '@/app/dashboard/sessions/actions';

interface TelemetryMeta {
  _telemetry: true;
  scores: {
    smoothness: number;
    throttleControl: number;
    brakeEfficiency: number;
    consistency: number;
    total: number;
  } | null;
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

function parseMeta(raw: string | null): TelemetryMeta | null {
  if (!raw) return null;
  try { const p = JSON.parse(raw); return p._telemetry ? p : null; }
  catch { return null; }
}

function fmtLapTime(ms: number | null): string {
  if (!ms || ms <= 0) return '--:--.---';
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function scoreColor(n: number): string {
  if (n >= 80) return '#22c55e';
  if (n >= 65) return '#f59e0b';
  return '#e8143c';
}

function MiniBar({ value }: { value: number }) {
  return (
    <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden w-full">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: scoreColor(value) }} />
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function SessionCard({
  s, compareMode, selected, onToggle, onDeleted, onRenamed,
}: {
  s: SessionRow;
  compareMode: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, label: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [labelDraft, setLabelDraft] = useState(s.session_label ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  function startRename(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setLabelDraft(s.session_label ?? '');
    setRenaming(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  }
  function cancelRename(e?: React.MouseEvent) {
    e?.preventDefault(); e?.stopPropagation();
    setRenaming(false); setLabelDraft(s.session_label ?? '');
  }
  function saveRename(e?: React.MouseEvent) {
    e?.preventDefault(); e?.stopPropagation();
    const trimmed = labelDraft.trim();
    setRenaming(false);
    startTransition(async () => { await renameSession(s.id, trimmed); onRenamed(s.id, trimmed || ''); });
  }
  function handleDelete(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    startTransition(async () => { await deleteSession(s.id); onDeleted(s.id); });
  }

  const meta   = parseMeta(s.series_name);
  const scores = meta?.scores ?? null;
  const badge  = !meta?.eventType ? 'SESSION'
    : /test/i.test(meta.eventType) ? 'TEST'
    : /race/i.test(meta.eventType) ? 'RACE'
    : /qual/i.test(meta.eventType) ? 'QUAL'
    : meta.eventType.slice(0, 4).toUpperCase();

  const cardContent = (
    <div className="flex flex-col sm:flex-row sm:items-start gap-5">
      {/* Left: session info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-lg bg-[#e8143c]/10 border border-[#e8143c]/20 text-[#e8143c] text-[9px] uppercase tracking-[0.12em] font-bold">
            {badge}
          </span>
          <span className="text-[11px] text-slate-600">{fmtDate(s.race_date)}</span>
        </div>
        {renaming ? (
          <div className="flex items-center gap-2 pr-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <input
              ref={inputRef} value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') cancelRename(); }}
              placeholder={s.track_name || 'Session name…'}
              className="flex-1 bg-[#0d0d18] border border-[#e8143c]/50 rounded-xl px-3 py-1.5 text-white text-[15px] font-bold outline-none min-w-0"
            />
            <button onClick={saveRename} className="shrink-0 px-3 py-1.5 rounded-xl bg-[#e8143c] text-white text-[12px] font-bold hover:bg-[#c8102f] transition-colors">Save</button>
            <button onClick={cancelRename} className="shrink-0 px-2 py-1.5 rounded-xl border border-white/[0.10] text-slate-500 text-[12px] hover:text-white transition-colors">✕</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group/title">
            <h2 className="text-[17px] font-bold text-white truncate">
              {s.session_label || s.track_name || 'Unknown Track'}
            </h2>
            {!compareMode && (
              <button onClick={startRename} className="shrink-0 p-1 rounded text-slate-700 hover:text-[#e8143c] transition-colors opacity-0 group-hover/title:opacity-100" title="Rename session">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>
        )}
        {s.session_label && <p className="text-[12px] text-slate-600 mt-0.5 truncate">{s.track_name}</p>}
        {s.car_name && <p className="text-[12px] text-slate-600 mt-0.5 truncate">{s.car_name}</p>}
        <div className="flex items-center gap-5 mt-4">
          <div>
            <p className="text-[15px] font-mono font-bold text-white">{fmtLapTime(s.fastest_lap_ms)}</p>
            <p className="text-[10px] uppercase text-slate-700 tracking-widest mt-0.5">Best Lap</p>
          </div>
          <div className="w-px h-8 bg-white/[0.06]" />
          <div>
            <p className={`text-[15px] font-bold ${s.incidents >= 3 ? 'text-[#e8143c]' : 'text-white'}`}>{s.incidents}</p>
            <p className="text-[10px] uppercase text-slate-700 tracking-widest mt-0.5">Incidents</p>
          </div>
          {meta?.topSpeed && (
            <>
              <div className="w-px h-8 bg-white/[0.06]" />
              <div>
                <p className="text-[15px] font-bold text-white">{Math.round(meta.topSpeed)} km/h</p>
                <p className="text-[10px] uppercase text-slate-700 tracking-widest mt-0.5">Top Speed</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: score panel */}
      {scores ? (
        <div className="sm:w-[190px] bg-[#0d0d18] border border-white/[0.06] rounded-2xl p-4 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">Score</span>
            <span className="text-[28px] font-black leading-none" style={{ color: scoreColor(scores.total) }}>{scores.total}</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Smoothness',  value: scores.smoothness },
              { label: 'Throttle',   value: scores.throttleControl },
              { label: 'Braking',    value: scores.brakeEfficiency },
              { label: 'Consistency',value: scores.consistency },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px] text-slate-600">{label}</span>
                  <span className="text-[10px] font-semibold" style={{ color: scoreColor(value) }}>{value}</span>
                </div>
                <MiniBar value={value} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="sm:w-[190px] bg-[#0d0d18] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-center shrink-0">
          <p className="text-[12px] text-slate-700 text-center">No score data</p>
        </div>
      )}
    </div>
  );

  if (compareMode) {
    return (
      <div
        onClick={() => onToggle(s.id)}
        className="relative group cursor-pointer rounded-2xl transition-all duration-200"
        style={{
          background: selected ? 'rgba(232,20,60,0.06)' : 'rgba(19,19,30,1)',
          border: selected ? '2px solid rgba(232,20,60,0.5)' : '2px solid rgba(255,255,255,0.07)',
          boxShadow: selected ? '0 0 20px rgba(232,20,60,0.12)' : 'none',
        }}
      >
        <div className="p-5 sm:p-6">
          {/* Selection badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
              style={{
                borderColor: selected ? '#e8143c' : 'rgba(255,255,255,0.2)',
                background: selected ? '#e8143c' : 'transparent',
              }}
            >
              {selected && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div className="relative group bg-[#13131e] border border-white/[0.07] rounded-2xl hover:border-[#e8143c]/25 hover:bg-[#1a1a28] transition-all duration-200">
      <Link href={`/dashboard/sessions/${s.id}`} className="block p-5 sm:p-6">
        {cardContent}
        <div className="flex items-center gap-1.5 mt-4 text-[11px] text-slate-700 group-hover:text-[#e8143c] transition-colors">
          <span>View full analysis</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </Link>

      {!confirmDelete ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true); }}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-700 hover:text-[#e8143c] hover:bg-[#e8143c]/10 transition-all opacity-0 group-hover:opacity-100"
          title="Delete session"
        >
          <TrashIcon />
        </button>
      ) : (
        <div className="absolute top-3 right-3 flex items-center gap-2 bg-[#1a1a28] border border-white/[0.10] rounded-xl px-3 py-2" onClick={(e) => e.preventDefault()}>
          <span className="text-[12px] text-slate-500">Delete?</span>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(false); }} className="text-[12px] text-slate-600 hover:text-white transition-colors px-1">Cancel</button>
          <button onClick={handleDelete} disabled={isPending} className="text-[12px] font-bold text-[#e8143c] hover:text-white transition-colors px-1 disabled:opacity-50">
            {isPending ? '…' : 'Delete'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────────────────────

export default function SessionsClient({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();
  const [items, setItems]           = useState(sessions);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id));
  }
  function handleRenamed(id: string, label: string) {
    setItems((prev) => prev.map((s) => s.id === id ? { ...s, session_label: label || null } : s));
  }
  function toggleCompareMode() {
    setCompareMode((m) => !m);
    setSelectedIds([]);
  }
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 2 ? [...prev, id] : prev,
    );
  }
  function goCompare() {
    if (selectedIds.length === 2) {
      router.push(`/dashboard/sessions/compare?a=${selectedIds[0]}&b=${selectedIds[1]}`);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] lg:h-screen px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#13131e] border border-white/[0.07] flex items-center justify-center mx-auto mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2,12 6,12 8,4 10,20 12,10 14,15 16,12 22,12"/>
            </svg>
          </div>
          <p className="text-white text-[18px] font-bold mb-2">No sessions yet</p>
          <p className="text-slate-500 text-[14px] mb-8">Upload an .ibt file and save your first analysis to see it here.</p>
          <Link href="/dashboard/telemetry" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#e8143c] hover:bg-[#c8102f] text-white text-[14px] font-bold transition-colors shadow-[0_4px_16px_rgba(232,20,60,0.3)]">
            Analyse a Session →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-32">

      {/* Header */}
      <div className="mb-7">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#e8143c] font-bold mb-1.5">Telemetry History</p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[24px] font-extrabold text-white">My Sessions</h1>
            <p className="text-[13px] text-slate-600 mt-1">
              {compareMode
                ? selectedIds.length === 0 ? 'Select 2 sessions to compare'
                  : selectedIds.length === 1 ? 'Select 1 more session'
                  : '2 sessions selected — ready to compare'
                : `${items.length} session${items.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!compareMode && (
              <Link
                href="/dashboard/telemetry"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e8143c] hover:bg-[#c8102f] text-white text-[12px] font-bold transition-colors shadow-[0_4px_12px_rgba(232,20,60,0.25)]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12l7-7 7 7" />
                </svg>
                New Analysis
              </Link>
            )}

            {items.length >= 2 && (
              <button
                onClick={toggleCompareMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all ${
                  compareMode
                    ? 'bg-white/[0.06] border border-white/[0.12] text-white hover:bg-white/[0.10]'
                    : 'bg-[#13131e] border border-white/[0.10] text-slate-400 hover:text-white hover:border-white/[0.20]'
                }`}
              >
                {compareMode ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Cancel
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    Compare
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Session list */}
      <div className="space-y-3">
        {items.map((s) => (
          <SessionCard
            key={s.id}
            s={s}
            compareMode={compareMode}
            selected={selectedIds.includes(s.id)}
            onToggle={toggleSelect}
            onDeleted={handleDeleted}
            onRenamed={handleRenamed}
          />
        ))}
      </div>

      {/* Floating compare CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none"
        style={{
          opacity: selectedIds.length === 2 ? 1 : 0,
          transform: selectedIds.length === 2 ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 250ms ease, transform 250ms ease',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div
            className="pointer-events-auto bg-[#13131e]/95 backdrop-blur-md border border-white/[0.10] rounded-2xl px-5 py-4 flex items-center justify-between shadow-[0_8px_40px_rgba(0,0,0,0.6)]"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(232,20,60,0.15)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                {selectedIds.map((id, i) => {
                  const s = items.find((x) => x.id === id);
                  return (
                    <div key={id} className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white border-2 border-[#13131e]"
                      style={{ background: i === 0 ? '#e8143c' : '#3b82f6', zIndex: i === 0 ? 2 : 1 }}>
                      {(s?.session_label || s?.track_name || '?').slice(0, 1).toUpperCase()}
                    </div>
                  );
                })}
              </div>
              <div>
                <p className="text-white text-[13px] font-semibold">2 sessions selected</p>
                <p className="text-slate-500 text-[11px]">Ready to compare head-to-head</p>
              </div>
            </div>
            <button
              onClick={goCompare}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#e8143c] hover:bg-[#c8102f] text-white text-[13px] font-bold transition-all shadow-[0_4px_16px_rgba(232,20,60,0.4)] hover:shadow-[0_4px_24px_rgba(232,20,60,0.6)]"
            >
              Compare Sessions
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
