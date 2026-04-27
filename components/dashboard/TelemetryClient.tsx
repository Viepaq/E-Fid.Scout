'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { IBTResult } from '@/lib/ibt-parser';
import { saveTelemetrySession } from '@/app/dashboard/telemetry/actions';
import AnalysisResultsView, { scoreColor, fmtLapTime } from '@/components/dashboard/AnalysisResultsView';

// ─── constants ────────────────────────────────────────────────────────────────

const STEPS = [
  'Reading file structure...',
  'Parsing telemetry channels...',
  'Calculating technique scores...',
  'Building lap analysis...',
];
const STEP_DELAYS = [0, 600, 1200, 1800];

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

// ─── StepItem ─────────────────────────────────────────────────────────────────

function StepItem({ text, status }: { text: string; status: 'waiting' | 'active' | 'done' }) {
  return (
    <div className="flex items-center gap-3.5">
      {status === 'done' ? (
        <div className="w-6 h-6 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center shrink-0">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      ) : status === 'active' ? (
        <div className="w-6 h-6 rounded-full bg-[#e8143c]/15 border border-[#e8143c]/40 flex items-center justify-center shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#e8143c] animate-pulse shadow-[0_0_6px_rgba(232,20,60,0.7)]" />
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
        </div>
      )}
      <span
        className="text-[14px] font-medium"
        style={{ color: status === 'done' ? '#22c55e' : status === 'active' ? 'white' : '#334155' }}
      >
        {text}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TelemetryClient({ userId, displayName }: {
  userId: string;
  displayName: string;
}) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging]       = useState(false);
  const [file, setFile]               = useState<File | null>(null);
  const [loading, setLoading]         = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError]             = useState<string | null>(null);
  const [result, setResult]           = useState<IBTResult | null>(null);
  const [visible, setVisible]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  useEffect(() => {
    if (result) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, [result]);

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith('.ibt')) { setError('File must be a .ibt file'); return; }
    setFile(f); setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  async function handleAnalyse() {
    if (!file) return;
    setLoading(true); setError(null);
    const timers = STEP_DELAYS.map((delay, i) => setTimeout(() => setLoadingStep(i + 1), delay));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const [res] = await Promise.all([
        fetch('/api/telemetry/parse', { method: 'POST', body: fd }),
        new Promise<void>((r) => setTimeout(r, 2000)),
      ]);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Parse failed');
      setResult(json as IBTResult);
    } catch (e: any) {
      setError(e.message);
    } finally {
      timers.forEach(clearTimeout);
      setLoading(false); setLoadingStep(0);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      await saveTelemetrySession(userId, {
        trackName: result.session.trackName || result.session.trackDisplayName,
        carName: result.session.carName,
        bestLapTime: result.session.bestLapTime,
        incidents: result.session.incidents,
        sessionDate: new Date(),
        scores: result.analysis.scores,
        topSpeed: result.analysis.topSpeed,
        eventType: result.session.eventType,
        driverName: result.session.driverName,
        fullResult: result,
      });
      setSaved(true);
      setTimeout(() => router.push('/dashboard/sessions'), 2000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setVisible(false);
    setTimeout(() => { setResult(null); setFile(null); setError(null); setSaved(false); }, 300);
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] lg:h-screen px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-10">
            <span className="w-2 h-2 rounded-full bg-[#e8143c] animate-pulse shadow-[0_0_6px_rgba(232,20,60,0.7)]" />
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#e8143c] font-bold">Analysing Session</p>
          </div>
          <div className="space-y-4">
            {STEPS.map((text, i) => {
              const stepNum = i + 1;
              const status  = loadingStep > stepNum ? 'done' : loadingStep === stepNum ? 'active' : 'waiting';
              return <StepItem key={i} text={text} status={status} />;
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Upload ───────────────────────────────────────────────────────────────

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] lg:h-screen px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#e8143c] font-bold mb-2">Telemetry Analysis</p>
            <h1 className="text-2xl font-extrabold text-white">Analyse your .ibt file</h1>
            <p className="text-sm text-slate-500 mt-1">Upload a session to get your driving score & lap breakdown</p>
          </div>

          <div
            className="relative flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 rounded-2xl"
            style={{
              minHeight: 260,
              background: dragging ? 'rgba(232,20,60,0.05)' : 'rgba(19,19,30,0.8)',
              border: `2px dashed ${dragging ? '#e8143c' : 'rgba(255,255,255,0.10)'}`,
              boxShadow: dragging ? '0 0 30px rgba(232,20,60,0.15) inset' : 'none',
            }}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input ref={inputRef} type="file" accept=".ibt" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

            <div className="w-14 h-14 rounded-2xl bg-[#e8143c]/10 border border-[#e8143c]/20 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8143c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
            </div>

            {file ? (
              <div className="text-center">
                <p className="text-white font-semibold text-[15px]">{file.name}</p>
                <p className="text-slate-600 text-[12px] mt-0.5">{(file.size / 1024 / 1024).toFixed(1)} MB · Ready to analyse</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-white font-semibold text-[14px]">Drop your .ibt file here</p>
                <p className="text-slate-600 text-[12px] mt-0.5">or click to browse</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-3 px-4 py-2.5 bg-[#e8143c]/10 border border-[#e8143c]/20 rounded-xl">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e8143c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[#e8143c] text-[12px]">{error}</p>
            </div>
          )}

          {file && (
            <button onClick={handleAnalyse} disabled={loading}
              className="mt-5 w-full h-[52px] rounded-2xl bg-[#e8143c] hover:bg-[#c8102f] text-white text-[15px] font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-60 shadow-[0_4px_20px_rgba(232,20,60,0.35)] hover:shadow-[0_4px_28px_rgba(232,20,60,0.5)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Analyse Session
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────

  const { session, analysis } = result;
  const scores    = analysis.scores;
  const validLaps = (result.laps ?? []).filter((l) => l.lapTime > 0);
  const lapStd    = validLaps.length >= 2
    ? Math.sqrt(validLaps.map((l) => l.lapTime).reduce((v, t, _, a) => v + (t - a.reduce((s, x) => s + x, 0) / a.length) ** 2, 0) / validLaps.length)
    : 0;

  const eventBadge = /test/i.test(session.eventType) ? 'Test'
    : /race/i.test(session.eventType) ? 'Race'
    : /qual/i.test(session.eventType) ? 'Qualifying'
    : session.eventType || 'Session';
  const summaryBest = session.bestLapTime > 0 ? fmtLapTime(session.bestLapTime) : '--:--.---';
  const stdColor    = lapStd < 1 ? '#22c55e' : lapStd < 2 ? '#f59e0b' : '#e8143c';

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 400ms cubic-bezier(0.16,1,0.3,1), transform 400ms cubic-bezier(0.16,1,0.3,1)',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/[0.06] bg-[#13131e]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(232,20,60,0.06)_0%,transparent_60%)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e8143c]/10 border border-[#e8143c]/20 text-[#e8143c] text-[10px] font-bold uppercase tracking-[0.12em]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e8143c] animate-pulse" />
                {eventBadge}
              </span>
            </div>
            <h1 className="text-[20px] sm:text-[24px] font-extrabold text-white leading-tight">
              {session.trackDisplayName || session.trackName}
            </h1>
            <p className="text-[13px] text-slate-500">
              {[session.trackConfig, session.carName].filter(Boolean).join(' · ')}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Best Lap',    value: summaryBest, mono: true },
              { label: 'Laps',        value: `${validLaps.length} / ${result.laps.length}` },
              { label: 'Consistency', value: lapStd > 0 ? `±${lapStd.toFixed(2)}s` : 'N/A', col: lapStd > 0 ? stdColor : undefined },
              { label: 'Top Speed',   value: `${Math.round(analysis.topSpeed)} km/h` },
            ].map(({ label, value, mono, col }) => (
              <div key={label} className="flex flex-col items-center bg-[#0d0d18] border border-white/[0.07] rounded-2xl px-4 py-3 gap-0.5">
                <span className={`text-[17px] sm:text-[19px] font-bold leading-none ${mono ? 'font-mono' : ''}`} style={{ color: col ?? 'white' }}>
                  {value}
                </span>
                <span className="text-[10px] uppercase text-slate-600 tracking-widest font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Analysis body (shared component) ─────────────────────────────── */}
      <AnalysisResultsView result={result} displayName={displayName} />

      {/* ── Sticky Save Bar ───────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-10 bg-[#13131e]/95 backdrop-blur-md border-t border-white/[0.07] px-4 sm:px-6 py-4">
        {error && <p className="text-[#e8143c] text-[11px] mb-2 text-right">{error}</p>}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-6xl mx-auto">
          <p className="text-[12px] text-slate-600 hidden sm:block">
            {session.trackDisplayName || session.trackName}
            {session.trackConfig ? ` · ${session.trackConfig}` : ''}
            &nbsp;·&nbsp;
            <span className="font-semibold" style={{ color: scoreColor(scores.total) }}>{scores.total}/100</span>
            &nbsp;·&nbsp;Best: <span className="font-mono text-slate-400">{summaryBest}</span>
            &nbsp;·&nbsp;{validLaps.length} laps
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto">
            <button onClick={handleReset}
              className="w-full sm:w-auto h-10 px-5 rounded-xl border border-white/[0.10] text-white text-[13px] font-medium bg-transparent hover:bg-white/[0.05] transition-colors">
              Analyse Another
            </button>
            <button onClick={handleSave} disabled={saving || saved}
              className="w-full sm:w-auto h-10 px-5 rounded-xl bg-[#e8143c] hover:bg-[#c8102f] text-white text-[13px] font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-[0_4px_12px_rgba(232,20,60,0.3)]">
              {saved ? (
                <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg><span className="text-[#22c55e]">Saved!</span></>
              ) : saving ? (
                <><svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>Saving…</>
              ) : 'Save to Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
