'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { IBTResult, LapData } from '@/lib/ibt-parser';

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface TelemetryMeta {
  _telemetry: true;
  scores: { smoothness: number; throttleControl: number; brakeEfficiency: number; consistency: number; total: number } | null;
  topSpeed: number | null;
  eventType: string | null;
  driverName: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMeta(raw: string | null): TelemetryMeta | null {
  if (!raw) return null;
  try { const p = JSON.parse(raw); return p._telemetry ? p : null; } catch { return null; }
}

function fmtLapTime(ms: number | null): string {
  if (!ms || ms <= 0) return '--:--.---';
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function scoreColor(n: number): string {
  if (n >= 80) return '#22c55e';
  if (n >= 65) return '#f59e0b';
  return '#e8143c';
}

const COLOR_A = '#e8143c';
const COLOR_B = '#3b82f6';

function sessionLabel(s: SessionRow): string {
  return s.session_label || s.track_name || 'Unknown';
}

function driverName(meta: TelemetryMeta | null, s: SessionRow): string {
  return meta?.driverName || s.session_label || s.track_name || 'Driver';
}

/** Short label that always uniquely identifies a session in charts/legends */
function seriesLabel(slot: 'A' | 'B', s: SessionRow, meta: TelemetryMeta | null): string {
  // session_label (user-defined name) is always the primary identifier
  const name = s.session_label || s.track_name || meta?.driverName || '';
  return name ? `${slot}: ${name}` : `Session ${slot}`;
}

function fmtLapSec(s: number): string {
  if (!s || s <= 0) return '--:--.---';
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}`;
}

// ─── Score dual bar ───────────────────────────────────────────────────────────

function DualBar({ label, a, b }: { label: string; a: number; b: number }) {
  const maxVal = 100;
  const winA = a > b;
  const winB = b > a;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold" style={{ color: winA ? COLOR_A : 'rgba(255,255,255,0.4)' }}>{a}</span>
        <span className="text-slate-500 uppercase tracking-[0.1em] text-[10px]">{label}</span>
        <span className="font-bold" style={{ color: winB ? COLOR_B : 'rgba(255,255,255,0.4)' }}>{b}</span>
      </div>
      <div className="flex gap-1 h-2 rounded-full overflow-hidden">
        {/* A bar — fills right-to-left */}
        <div className="flex-1 flex justify-end bg-white/[0.04] rounded-l-full overflow-hidden">
          <div
            className="h-full rounded-l-full transition-all duration-700"
            style={{ width: `${(a / maxVal) * 100}%`, background: winA ? COLOR_A : 'rgba(232,20,60,0.35)' }}
          />
        </div>
        {/* B bar — fills left-to-right */}
        <div className="flex-1 bg-white/[0.04] rounded-r-full overflow-hidden">
          <div
            className="h-full rounded-r-full transition-all duration-700"
            style={{ width: `${(b / maxVal) * 100}%`, background: winB ? COLOR_B : 'rgba(59,130,246,0.35)' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Stat compare card ────────────────────────────────────────────────────────

function StatCard({ label, a, b, format = (v: string) => v, lowerIsBetter = false, compareA, compareB }: {
  label: string;
  a: string | number | null;
  b: string | number | null;
  format?: (v: string) => string;
  lowerIsBetter?: boolean;
  /** Override numeric value used for winner comparison when display value is a formatted string */
  compareA?: number | null;
  compareB?: number | null;
}) {
  const aNum = compareA !== undefined ? (compareA ?? NaN) : typeof a === 'number' ? a : parseFloat(String(a ?? ''));
  const bNum = compareB !== undefined ? (compareB ?? NaN) : typeof b === 'number' ? b : parseFloat(String(b ?? ''));
  const hasNums = !isNaN(aNum) && !isNaN(bNum);
  let winA = false, winB = false;
  if (hasNums) {
    winA = lowerIsBetter ? aNum < bNum : aNum > bNum;
    winB = lowerIsBetter ? bNum < aNum : bNum > aNum;
  }
  return (
    <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-4 text-center">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600 mb-3">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex flex-col items-center">
          <p className="text-[16px] font-black leading-none" style={{ color: winA ? COLOR_A : 'white' }}>
            {a === null || a === undefined ? '—' : format(String(a))}
          </p>
          {winA && <span className="text-[9px] mt-1 font-bold uppercase tracking-widest" style={{ color: COLOR_A }}>winner</span>}
        </div>
        <div className="text-[10px] text-slate-700 font-bold">vs</div>
        <div className="flex-1 flex flex-col items-center">
          <p className="text-[16px] font-black leading-none" style={{ color: winB ? COLOR_B : 'white' }}>
            {b === null || b === undefined ? '—' : format(String(b))}
          </p>
          {winB && <span className="text-[9px] mt-1 font-bold uppercase tracking-widest" style={{ color: COLOR_B }}>winner</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────

function CompareTooltip({ active, payload, label, labelA, labelB, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#13131e]/95 backdrop-blur-sm border border-white/[0.10] rounded-xl px-3 py-2.5 text-[12px]">
      <p className="text-slate-500 mb-1.5">{(label * 100).toFixed(1)}% dist</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {i === 0 ? labelA : labelB}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{unit}
        </p>
      ))}
    </div>
  );
}

// ─── Chart overlay ────────────────────────────────────────────────────────────

type Channel = 'speed' | 'throttle' | 'brake' | 'steering';
const CHANNEL_CONFIG: Record<Channel, { label: string; unit: string; domain: [number | string, number | string]; yFmt: (v: number) => string }> = {
  speed:    { label: 'Speed',    unit: ' km/h', domain: [0, 'auto'], yFmt: (v) => `${v}` },
  throttle: { label: 'Throttle', unit: '%',     domain: [0, 100],    yFmt: (v) => `${v}%` },
  brake:    { label: 'Brake',    unit: '%',     domain: [0, 100],    yFmt: (v) => `${v}%` },
  steering: { label: 'Steering', unit: '°',     domain: ['auto', 'auto'], yFmt: (v) => `${v}°` },
};

function buildChannelData(channel: Channel, lapA: LapData | null, lapB: LapData | null) {
  const lenA = lapA?.chart?.pct?.length ?? 0;
  const lenB = lapB?.chart?.pct?.length ?? 0;
  const len  = Math.max(lenA, lenB);
  if (len === 0) return [];

  const result: { pct: number; a?: number; b?: number }[] = [];
  for (let i = 0; i < len; i++) {
    const pct = i / Math.max(len - 1, 1);
    const iA  = lapA && lenA > 0 ? Math.min(Math.floor(pct * (lenA - 1)), lenA - 1) : -1;
    const iB  = lapB && lenB > 0 ? Math.min(Math.floor(pct * (lenB - 1)), lenB - 1) : -1;

    const getV = (lap: LapData | null, idx: number): number | undefined => {
      if (!lap || idx < 0) return undefined;
      const c = lap.chart;
      // chart.speed already in km/h (parser multiplies by 3.6)
      if (channel === 'speed')    return c.speed?.[idx] !== undefined ? +(c.speed[idx]).toFixed(1) : undefined;
      if (channel === 'throttle') return c.throttle?.[idx] !== undefined ? +(c.throttle[idx] * 100).toFixed(1) : undefined;
      if (channel === 'brake')    return c.brake?.[idx] !== undefined ? +(c.brake[idx] * 100).toFixed(1) : undefined;
      if (channel === 'steering') return c.steering?.[idx] !== undefined ? +(c.steering[idx] * (180 / Math.PI)).toFixed(1) : undefined;
      return undefined;
    };

    result.push({ pct, a: getV(lapA, iA), b: getV(lapB, iB) });
  }
  return result;
}

// ─── Lap time chart data ───────────────────────────────────────────────────────

function buildLapChartData(lapsA: LapData[], lapsB: LapData[]) {
  const maxLap = Math.max(...lapsA.map((l) => l.lapNumber), ...lapsB.map((l) => l.lapNumber), 1);
  const mapA = new Map(lapsA.map((l) => [l.lapNumber, l.lapTime]));
  const mapB = new Map(lapsB.map((l) => [l.lapNumber, l.lapTime]));
  const result: { lap: number; a?: number; b?: number }[] = [];
  for (let n = 1; n <= maxLap; n++) {
    const a = mapA.get(n);
    const b = mapB.get(n);
    if (a !== undefined || b !== undefined) {
      result.push({
        lap: n,
        a: a && a > 0 ? +(a).toFixed(3) : undefined,
        b: b && b > 0 ? +(b).toFixed(3) : undefined,
      });
    }
  }
  return result;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CompareClient({
  sessionA, sessionB, resultA, resultB,
}: {
  sessionA: SessionRow;
  sessionB: SessionRow;
  resultA: IBTResult | null;
  resultB: IBTResult | null;
}) {
  const [activeChannel, setActiveChannel] = useState<Channel>('speed');

  const metaA = parseMeta(sessionA.series_name);
  const metaB = parseMeta(sessionB.series_name);
  const scoresA = metaA?.scores ?? null;
  const scoresB = metaB?.scores ?? null;

  const lapsA: LapData[] = useMemo(() => (resultA?.laps ?? []).filter((l) => l.lapTime > 0), [resultA]);
  const lapsB: LapData[] = useMemo(() => (resultB?.laps ?? []).filter((l) => l.lapTime > 0), [resultB]);

  const defaultIdxA = useMemo(() => {
    const bi = lapsA.findIndex((l) => l.isBest);
    return bi >= 0 ? bi : lapsA.length > 0 ? lapsA.reduce((best, l, i) => l.lapTime < lapsA[best].lapTime ? i : best, 0) : -1;
  }, [lapsA]);
  const defaultIdxB = useMemo(() => {
    const bi = lapsB.findIndex((l) => l.isBest);
    return bi >= 0 ? bi : lapsB.length > 0 ? lapsB.reduce((best, l, i) => l.lapTime < lapsB[best].lapTime ? i : best, 0) : -1;
  }, [lapsB]);

  const [selectedLapIdxA, setSelectedLapIdxA] = useState<number>(-1);
  const [selectedLapIdxB, setSelectedLapIdxB] = useState<number>(-1);

  // Sync to best lap once laps load
  const resolvedIdxA = selectedLapIdxA >= 0 ? selectedLapIdxA : defaultIdxA;
  const resolvedIdxB = selectedLapIdxB >= 0 ? selectedLapIdxB : defaultIdxB;

  const selectedLapA = resolvedIdxA >= 0 ? (lapsA[resolvedIdxA] ?? null) : null;
  const selectedLapB = resolvedIdxB >= 0 ? (lapsB[resolvedIdxB] ?? null) : null;

  const overlayData = useMemo(() => buildChannelData(activeChannel, selectedLapA, selectedLapB), [activeChannel, selectedLapA, selectedLapB]);
  const lapChartData = useMemo(() => buildLapChartData(lapsA, lapsB), [lapsA, lapsB]);

  const cfg = CHANNEL_CONFIG[activeChannel];

  const hasBestLapCharts = (selectedLapA?.chart?.pct?.length ?? 0) > 0 || (selectedLapB?.chart?.pct?.length ?? 0) > 0
    || lapsA.some((l) => (l.chart?.pct?.length ?? 0) > 0)
    || lapsB.some((l) => (l.chart?.pct?.length ?? 0) > 0);
  const hasLapProgression = lapsA.length >= 2 || lapsB.length >= 2;

  // Compute who wins overall
  const totalA = scoresA?.total ?? null;
  const totalB = scoresB?.total ?? null;
  const overallWinner = totalA !== null && totalB !== null
    ? totalA > totalB ? 'A' : totalB > totalA ? 'B' : 'tie'
    : null;

  // Auto-generate insights
  const insights = useMemo(() => {
    const lines: { text: string; type: 'good' | 'info' | 'warn' }[] = [];
    const nameA = driverName(metaA, sessionA);
    const nameB = driverName(metaB, sessionB);

    if (sessionA.fastest_lap_ms && sessionB.fastest_lap_ms) {
      const diff = Math.abs(sessionA.fastest_lap_ms - sessionB.fastest_lap_ms);
      const faster = sessionA.fastest_lap_ms < sessionB.fastest_lap_ms ? nameA : nameB;
      lines.push({ text: `${faster} set the fastest lap, ${(diff / 1000).toFixed(3)}s quicker on the best lap.`, type: 'good' });
    }

    if (scoresA && scoresB) {
      if (Math.abs(scoresA.total - scoresB.total) > 5) {
        const better = scoresA.total > scoresB.total ? nameA : nameB;
        lines.push({ text: `${better} has a higher overall technique score — cleaner inputs across the board.`, type: 'info' });
      }

      const metrics = [
        { key: 'smoothness', label: 'steering smoothness', a: scoresA.smoothness, b: scoresB.smoothness },
        { key: 'throttle',   label: 'throttle discipline', a: scoresA.throttleControl, b: scoresB.throttleControl },
        { key: 'brake',      label: 'braking technique',   a: scoresA.brakeEfficiency, b: scoresB.brakeEfficiency },
        { key: 'consistency',label: 'lap-to-lap consistency', a: scoresA.consistency, b: scoresB.consistency },
      ];
      for (const m of metrics) {
        const diff = Math.abs(m.a - m.b);
        if (diff >= 15) {
          const better = m.a > m.b ? nameA : nameB;
          lines.push({ text: `${better} has a significant edge in ${m.label} (+${diff} pts).`, type: diff >= 25 ? 'good' : 'info' });
        }
      }
    }

    if (metaA?.topSpeed && metaB?.topSpeed) {
      const diff = Math.abs(metaA.topSpeed - metaB.topSpeed);
      if (diff > 5) {
        const faster = metaA.topSpeed > metaB.topSpeed ? nameA : nameB;
        lines.push({ text: `${faster} reached a higher top speed (+${diff.toFixed(0)} km/h).`, type: 'info' });
      }
    }

    if (lapsA.length && lapsB.length) {
      const diff = Math.abs(lapsA.length - lapsB.length);
      if (diff > 0) {
        lines.push({ text: `${nameA} completed ${lapsA.length} laps, ${nameB} completed ${lapsB.length} laps.`, type: 'info' });
      }
    }

    return lines;
  }, [metaA, metaB, sessionA, sessionB, scoresA, scoresB, lapsA, lapsB]);

  const badgeStyle = (meta: TelemetryMeta | null) => {
    const et = meta?.eventType ?? '';
    return /test/i.test(et) ? 'TEST' : /race/i.test(et) ? 'RACE' : /qual/i.test(et) ? 'QUAL' : 'SESSION';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

      {/* Back nav */}
      <Link
        href="/dashboard/sessions"
        className="inline-flex items-center gap-2 text-[12px] text-slate-500 hover:text-white transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to Sessions
      </Link>

      {/* Page title */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[#e8143c] font-bold mb-1">Head-to-Head</p>
        <h1 className="text-[26px] font-extrabold text-white">Session Comparison</h1>
        <p className="text-[14px] text-slate-500 mt-1">
          {sessionA.session_label || sessionA.track_name || 'Session A'}
          {' vs '}
          {sessionB.session_label || sessionB.track_name || 'Session B'}
        </p>
      </div>

      {/* Session header cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { s: sessionA, meta: metaA, color: COLOR_A, label: 'A' },
          { s: sessionB, meta: metaB, color: COLOR_B, label: 'B' },
        ].map(({ s, meta, color, label }) => (
          <div
            key={s.id}
            className="bg-[#13131e] rounded-2xl p-4 sm:p-5 border"
            style={{ borderColor: `${color}30` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
                style={{ background: color }}>
                {label}
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-[0.12em] font-bold"
                style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                {badgeStyle(meta)}
              </span>
              <span className="text-[11px] text-slate-600 truncate">{fmtDate(s.race_date)}</span>
            </div>
            <p className="text-[15px] sm:text-[17px] font-bold text-white truncate mb-0.5">
              {s.session_label || driverName(meta, s)}
            </p>
            {s.session_label && meta?.driverName && (
              <p className="text-[12px] text-slate-400 truncate">{meta.driverName}</p>
            )}
            {s.track_name && <p className="text-[12px] text-slate-500 truncate">{s.track_name}</p>}
            {s.car_name && <p className="text-[11px] text-slate-600 truncate mt-0.5">{s.car_name}</p>}
          </div>
        ))}
      </div>

      {/* ── Overall score duel ──────────────────────────────────────────────── */}
      {(totalA !== null || totalB !== null) && (
        <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 sm:p-6 mb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 font-bold mb-5">Overall Score</p>
          <div className="flex items-center justify-between gap-4">
            <div className="text-center flex-1">
              <div className="text-[52px] font-black leading-none" style={{ color: overallWinner === 'A' ? COLOR_A : 'white' }}>
                {totalA ?? '—'}
              </div>
              <p className="text-[12px] text-slate-500 mt-1">{seriesLabel('A', sessionA, metaA)}</p>
              {overallWinner === 'A' && (
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: `${COLOR_A}15`, color: COLOR_A, border: `1px solid ${COLOR_A}30` }}>
                  Winner
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-px h-10 bg-white/[0.07]" />
              <span className="text-[11px] text-slate-700 font-bold">vs</span>
              <div className="w-px h-10 bg-white/[0.07]" />
            </div>

            <div className="text-center flex-1">
              <div className="text-[52px] font-black leading-none" style={{ color: overallWinner === 'B' ? COLOR_B : 'white' }}>
                {totalB ?? '—'}
              </div>
              <p className="text-[12px] text-slate-500 mt-1">{seriesLabel('B', sessionB, metaB)}</p>
              {overallWinner === 'B' && (
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
                  style={{ background: `${COLOR_B}15`, color: COLOR_B, border: `1px solid ${COLOR_B}30` }}>
                  Winner
                </span>
              )}
            </div>
          </div>

          {overallWinner === 'tie' && (
            <p className="text-center text-[12px] text-slate-500 mt-3">Dead heat — identical overall scores!</p>
          )}
        </div>
      )}

      {/* ── Technique breakdown ──────────────────────────────────────────────── */}
      {scoresA && scoresB && (
        <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 font-bold">Technique Breakdown</p>
            <div className="flex items-center gap-4 text-[11px] flex-wrap justify-end">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLOR_A }} />{seriesLabel('A', sessionA, metaA)}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLOR_B }} />{seriesLabel('B', sessionB, metaB)}</span>
            </div>
          </div>
          <div className="space-y-4">
            <DualBar label="Smoothness"   a={scoresA.smoothness}     b={scoresB.smoothness} />
            <DualBar label="Throttle"     a={scoresA.throttleControl} b={scoresB.throttleControl} />
            <DualBar label="Braking"      a={scoresA.brakeEfficiency} b={scoresB.brakeEfficiency} />
            <DualBar label="Consistency"  a={scoresA.consistency}    b={scoresB.consistency} />
          </div>
        </div>
      )}

      {/* ── Key stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Best Lap"
          a={fmtLapTime(sessionA.fastest_lap_ms)}
          b={fmtLapTime(sessionB.fastest_lap_ms)}
          compareA={sessionA.fastest_lap_ms}
          compareB={sessionB.fastest_lap_ms}
          lowerIsBetter
        />
        <StatCard
          label="Top Speed"
          a={metaA?.topSpeed ? `${Math.round(metaA.topSpeed)} km/h` : null}
          b={metaB?.topSpeed ? `${Math.round(metaB.topSpeed)} km/h` : null}
        />
        <StatCard
          label="Incidents"
          a={sessionA.incidents}
          b={sessionB.incidents}
          lowerIsBetter
        />
        <StatCard
          label="Total Laps"
          a={lapsA.length || null}
          b={lapsB.length || null}
        />
      </div>

      {/* ── Lap overlay chart ───────────────────────────────────────────────── */}
      {hasBestLapCharts && (
        <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 sm:p-6 mb-4">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 font-bold self-center">Lap Overlay</p>
            {/* Channel tabs */}
            <div className="flex gap-1 bg-[#0d0d18] rounded-xl p-1">
              {(Object.keys(CHANNEL_CONFIG) as Channel[]).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setActiveChannel(ch)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: activeChannel === ch ? '#1e1e30' : 'transparent',
                    color: activeChannel === ch ? 'white' : 'rgba(148,163,184,0.6)',
                    borderBottom: activeChannel === ch ? `2px solid ${COLOR_A}` : '2px solid transparent',
                  }}
                >
                  {CHANNEL_CONFIG[ch].label}
                </button>
              ))}
            </div>
          </div>

          {/* Lap selectors */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {([
              { label: seriesLabel('A', sessionA, metaA), laps: lapsA, idx: resolvedIdxA, setIdx: setSelectedLapIdxA, color: COLOR_A },
              { label: seriesLabel('B', sessionB, metaB), laps: lapsB, idx: resolvedIdxB, setIdx: setSelectedLapIdxB, color: COLOR_B },
            ] as const).map(({ label, laps, idx, setIdx, color }, si) => (
              <div key={si}>
                <p className="text-[10px] font-semibold mb-1.5 truncate" style={{ color }}>{label}</p>
                {laps.length === 0 ? (
                  <div className="h-9 flex items-center px-3 bg-[#0d0d18] rounded-xl text-[12px] text-slate-600">No laps</div>
                ) : (
                  <select
                    value={idx}
                    onChange={(e) => setIdx(Number(e.target.value))}
                    className="w-full h-9 bg-[#0d0d18] border border-white/[0.08] rounded-xl px-3 text-[12px] font-semibold text-white outline-none appearance-none cursor-pointer"
                    style={{ borderColor: `${color}30` }}
                  >
                    {laps.map((l, i) => (
                      <option key={i} value={i} style={{ background: '#13131e' }}>
                        Lap {l.lapNumber}
                        {l.isBest ? ' ★ Best' : ''}
                        {' — '}
                        {fmtLapTime(l.lapTime * 1000)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          <div className="h-[200px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              {cfg.label === 'Steering' ? (
                <LineChart data={overlayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="pct" type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={cfg.yFmt} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} domain={cfg.domain} />
                  <Tooltip content={<CompareTooltip labelA={seriesLabel('A', sessionA, metaA)} labelB={seriesLabel('B', sessionB, metaB)} unit={cfg.unit} />} />
                  <Line type="monotone" dataKey="a" stroke={COLOR_A} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="b" stroke={COLOR_B} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                </LineChart>
              ) : (
                <AreaChart data={overlayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLOR_A} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={COLOR_A} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLOR_B} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={COLOR_B} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="pct" type="number" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={cfg.yFmt} tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} domain={cfg.domain} />
                  <Tooltip content={<CompareTooltip labelA={seriesLabel('A', sessionA, metaA)} labelB={seriesLabel('B', sessionB, metaB)} unit={cfg.unit} />} />
                  <Area type="monotone" dataKey="a" stroke={COLOR_A} strokeWidth={1.8} fill="url(#gradA)" dot={false} isAnimationActive={false} />
                  <Area type="monotone" dataKey="b" stroke={COLOR_B} strokeWidth={1.8} fill="url(#gradB)" dot={false} isAnimationActive={false} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-5 mt-3 justify-center">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-block w-4 h-0.5 rounded" style={{ background: COLOR_A }} />
              {seriesLabel('A', sessionA, metaA)}{selectedLapA ? ` — Lap ${selectedLapA.lapNumber}` : ''}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-block w-4 h-0.5 rounded" style={{ background: COLOR_B }} />
              {seriesLabel('B', sessionB, metaB)}{selectedLapB ? ` — Lap ${selectedLapB.lapNumber}` : ''}
            </span>
          </div>
        </div>
      )}

      {/* ── Lap time progression ─────────────────────────────────────────────── */}
      {hasLapProgression && lapChartData.length > 0 && (
        <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 sm:p-6 mb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 font-bold mb-1">Lap Time Progression</p>
          <p className="text-[12px] text-slate-500 mb-4">Lap-by-lap consistency — lower is faster</p>
          <div className="h-[200px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lapChartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="lap"
                  tick={{ fill: '#475569', fontSize: 10 }}
                  tickLine={false} axisLine={false}
                  label={{ value: 'Lap', position: 'insideBottomRight', offset: -4, fill: '#475569', fontSize: 10 }}
                />
                <YAxis
                  tickFormatter={fmtLapSec}
                  tick={{ fill: '#475569', fontSize: 10 }}
                  tickLine={false} axisLine={false}
                  domain={['auto', 'auto']}
                  width={56}
                />
                <Tooltip
                  formatter={(v: any, name: any) => [
                    fmtLapSec(v),
                    seriesLabel(name === 'a' ? 'A' : 'B', name === 'a' ? sessionA : sessionB, name === 'a' ? metaA : metaB),
                  ]}
                  contentStyle={{ background: '#13131e', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', fontSize: '12px', color: 'white' }}
                  labelFormatter={(l) => `Lap ${l}`}
                />
                <Line type="monotone" dataKey="a" name="a" stroke={COLOR_A} strokeWidth={2} dot={{ r: 3, fill: COLOR_A, strokeWidth: 0 }} isAnimationActive={false} connectNulls={false} />
                <Line type="monotone" dataKey="b" name="b" stroke={COLOR_B} strokeWidth={2} dot={{ r: 3, fill: COLOR_B, strokeWidth: 0 }} isAnimationActive={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-5 mt-3 justify-center flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-block w-4 h-0.5 rounded" style={{ background: COLOR_A }} />
              {seriesLabel('A', sessionA, metaA)}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="inline-block w-4 h-0.5 rounded" style={{ background: COLOR_B }} />
              {seriesLabel('B', sessionB, metaB)}
            </span>
          </div>
        </div>
      )}

      {/* ── Insights ────────────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 sm:p-6 mb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600 font-bold mb-4">Analysis</p>
          <div className="space-y-2.5">
            {insights.map((ins, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: ins.type === 'good' ? 'rgba(34,197,94,0.05)' : ins.type === 'warn' ? 'rgba(232,20,60,0.05)' : 'rgba(59,130,246,0.05)',
                  borderLeft: `3px solid ${ins.type === 'good' ? '#22c55e' : ins.type === 'warn' ? '#e8143c' : '#3b82f6'}`,
                }}
              >
                <p className="text-[13px] text-slate-300 leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data fallback */}
      {!scoresA && !scoresB && !hasBestLapCharts && (
        <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-8 text-center">
          <p className="text-slate-500 text-[14px]">Neither session has telemetry data for detailed comparison.</p>
          <p className="text-slate-700 text-[12px] mt-1">Sessions saved from .ibt analysis include full score and chart data.</p>
        </div>
      )}
    </div>
  );
}
