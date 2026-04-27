'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, LineChart,
  Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import type { IBTResult, LapData } from '@/lib/ibt-parser';

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = 'speed' | 'throttle' | 'brake' | 'steering';

const CHANNEL_CONFIG: Record<Channel, { label: string; unit: string; color: string }> = {
  speed:    { label: 'Speed',    unit: 'km/h', color: '#3b82f6' },
  throttle: { label: 'Throttle', unit: '%',    color: '#22c55e' },
  brake:    { label: 'Brake',    unit: '%',    color: '#e8143c' },
  steering: { label: 'Steering', unit: '°',    color: '#f59e0b' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtLapTime(s: number): string {
  if (!s || s <= 0) return '--:--.---';
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}`;
}

export function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#f59e0b';
  return '#e8143c';
}

function gapColor(gap: number): string {
  if (gap === 0) return '#22c55e';
  if (gap < 0.5) return '#84cc16';
  if (gap < 1.0) return '#f59e0b';
  return '#e8143c';
}

function clientStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

function getChannelVal(lap: LapData, channel: Channel, i: number): number {
  switch (channel) {
    case 'speed':    return lap.chart.speed[i] ?? 0;
    case 'throttle': return (lap.chart.throttle[i] ?? 0) * 100;
    case 'brake':    return (lap.chart.brake[i] ?? 0) * 100;
    case 'steering': return ((lap.chart.steering[i] ?? 0) * 180) / Math.PI;
  }
}

function buildLapChartData(lap: LapData, channel: Channel) {
  return lap.chart.pct.map((pct, i) => ({
    pct: Math.round(pct * 100),
    value: getChannelVal(lap, channel, i),
  }));
}

function buildCompareData(lapA: LapData, lapB: LapData, channel: Channel) {
  return lapA.chart.pct.map((pct, i) => ({
    pct: Math.round(pct * 100),
    a: getChannelVal(lapA, channel, i),
    b: getChannelVal(lapB, channel, i),
  }));
}

// ─── Insights ─────────────────────────────────────────────────────────────────

function generateInsights(laps: LapData[]): { text: string; type: 'good' | 'info' | 'warn' }[] {
  const valid      = laps.filter((l) => l.lapTime > 0);
  const incomplete = laps.filter((l) => l.lapTime <= 0);
  const out: { text: string; type: 'good' | 'info' | 'warn' }[] = [];

  if (valid.length === 0) return [{ text: 'No completed laps detected in this session.', type: 'warn' }];

  const best    = valid.find((l) => l.isBest) ?? valid.reduce((a, b) => a.lapTime < b.lapTime ? a : b);
  const avgTime = valid.reduce((s, l) => s + l.lapTime, 0) / valid.length;
  const std     = clientStdDev(valid.map((l) => l.lapTime));

  out.push({ text: `Your fastest lap was Lap ${best.lapNumber} with a time of ${fmtLapTime(best.lapTime)}.`, type: 'good' });

  if (valid.length >= 2) {
    out.push({ text: `Average lap time across ${valid.length} completed laps was ${fmtLapTime(avgTime)}.`, type: 'info' });
    if (std < 0.5) {
      out.push({ text: `Excellent consistency — lap times vary by only ±${std.toFixed(3)}s.`, type: 'good' });
    } else if (std < 1.5) {
      out.push({ text: `Consistency is decent (±${std.toFixed(2)}s). Focus on repeating your reference points each lap.`, type: 'info' });
    } else {
      out.push({ text: `Lap times vary significantly (±${std.toFixed(2)}s). Establish fixed braking and turn-in markers to build consistency.`, type: 'warn' });
    }

    const sortedByTime = [...valid].sort((a, b) => a.lapTime - b.lapTime);
    const second = sortedByTime[1];
    if (best.chart.speed.length > 0 && second) {
      let maxDrop = 0, maxDropIdx = 0;
      for (let i = 0; i < best.chart.speed.length; i++) {
        const drop = (best.chart.speed[i] ?? 0) - (second.chart.speed[i] ?? 0);
        if (drop > maxDrop) { maxDrop = drop; maxDropIdx = i; }
      }
      if (maxDrop > 5) {
        const pct = Math.round((maxDropIdx / best.chart.speed.length) * 100);
        out.push({ text: `You were slower mainly where speed dropped most on Lap ${second.lapNumber} — around ${pct}% of the lap (${maxDrop.toFixed(1)} km/h below your best lap).`, type: 'warn' });
      }
    }

    const fastestTopSpeed = valid.reduce((a, b) => a.topSpeed > b.topSpeed ? a : b);
    if (fastestTopSpeed.lapNumber !== best.lapNumber) {
      out.push({ text: `You reached higher top speed (${Math.round(fastestTopSpeed.topSpeed)} km/h) on Lap ${fastestTopSpeed.lapNumber} — not your fastest lap. Explore if that speed can translate to a quicker time.`, type: 'info' });
    } else {
      out.push({ text: `Top speed of ${Math.round(best.topSpeed)} km/h was achieved on your best lap — good correlation between pace and straight-line speed.`, type: 'info' });
    }
  }

  if (incomplete.length > 0) {
    const nums = incomplete.map((l) => `Lap ${l.lapNumber}`).join(', ');
    out.push({ text: `${nums} ${incomplete.length === 1 ? 'was' : 'were'} incomplete and excluded from best-lap analysis.`, type: 'info' });
  }

  return out;
}

// ─── Metric interpretation ────────────────────────────────────────────────────

function metricInterpretation(metric: 'smoothness' | 'throttle' | 'brake' | 'consistency', score: number, lapCount?: number): string {
  if (metric === 'smoothness') {
    if (score >= 90) return 'Clean exit — no car fighting';
    if (score >= 70) return 'Minor corrections on exit';
    if (score >= 50) return 'Fighting the car mid-corner';
    return 'Heavy mid-corner corrections';
  }
  if (metric === 'throttle') {
    if (score >= 90) return 'Smooth, progressive application';
    if (score >= 70) return 'Mostly smooth, few snaps';
    if (score >= 50) return 'Frequent snap applications';
    return 'Aggressive throttle inputs';
  }
  if (metric === 'brake') {
    if (score >= 90) return 'Clean trail braking';
    if (score >= 70) return 'Good, minor instability';
    if (score >= 50) return 'Some lock / panic releases';
    return 'Frequent brake lock events';
  }
  if ((lapCount ?? 0) < 2) return 'Need more laps for data';
  if (score >= 90) return 'Exceptional repeatability';
  if (score >= 70) return 'Good lap-to-lap consistency';
  if (score >= 50) return 'Moderate variation';
  return 'High lap time variation';
}

// ─── METRIC_DETAIL ────────────────────────────────────────────────────────────

const METRIC_DETAIL: Record<'smoothness' | 'throttle' | 'brake' | 'consistency', string> = {
  smoothness:   'Measures steering corrections while on throttle (>60%). Frequent corrections indicate the car is out of balance on exit — usually from too much entry speed or poor weight transfer. Lower movement = better car balance.',
  throttle:     'Counts snap throttle events per lap — times the throttle jumps from ≤15% to ≥65% in under 85 ms. Abrupt inputs break rear traction and cause snap oversteer. Smooth, progressive application protects grip.',
  brake:        'Detects brake lock / panic-release events per lap — sudden pressure drops from >50% in a single frame (16 ms). Clean trail braking with gradual, controlled release through the corner improves rotation and exit.',
  consistency:  'Coefficient of variation of lap times (std dev ÷ mean). The gold standard in motorsport. ±0.3% = elite, ±0.6% = good, ±1.2% = room to improve, ±2.5%+ = focus on reference points.',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

export function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = scoreColor(score);
  const cx = size / 2;
  const pad = size * 0.08;
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={size * 0.048} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={size * 0.048}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}70)`, transition: 'stroke-dasharray 1s ease-out' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 900, color: 'white', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.075, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Score</span>
      </div>
    </div>
  );
}

function MetricRingCard({ label, score, interpretation, metricKey }: {
  label: string; score: number; interpretation: string;
  metricKey: 'smoothness' | 'throttle' | 'brake' | 'consistency';
}) {
  const [animScore, setAnimScore] = useState(0);
  const [open, setOpen]           = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimScore(score), 80); return () => clearTimeout(t); }, [score]);
  const size = 96; const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (animScore / 100) * circ;
  const color = scoreColor(score);
  return (
    <div onClick={() => setOpen((o) => !o)}
      className="relative bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 flex flex-col items-center gap-3 cursor-pointer select-none overflow-hidden transition-colors"
      style={{ borderColor: open ? `${color}40` : undefined }}>
      <div style={{ opacity: open ? 0 : 1, transform: open ? 'scale(0.92)' : 'scale(1)', transition: 'opacity 200ms ease, transform 200ms ease', pointerEvents: open ? 'none' : 'auto' }}
        className="flex flex-col items-center gap-3 w-full">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`-6 -6 ${size + 12} ${size + 12}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5.5" />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5.5"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px ${color}80)`, transition: 'stroke-dasharray 1s ease-out 100ms' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[22px] font-black text-white leading-none">{score}</span>
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color }}>{label}</p>
          <p className="text-[11px] text-slate-500 leading-snug">{interpretation}</p>
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, padding: '16px', opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(12px)', transition: 'opacity 220ms ease, transform 220ms ease', pointerEvents: open ? 'auto' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color }}>{label}</p>
            <span className="text-[18px] font-black leading-none" style={{ color }}>{score}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{METRIC_DETAIL[metricKey]}</p>
        </div>
        <p className="text-[9px] text-slate-700 uppercase tracking-[0.1em] mt-2">Tap to close</p>
      </div>
    </div>
  );
}

export function GaugeBarCard({ label, value, max, unit, color, icon }: {
  label: string; value: number; max: number; unit: string; color: string; icon: React.ReactNode;
}) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(Math.min((value / max) * 100, 100)), 120); return () => clearTimeout(t); }, [value, max]);
  return (
    <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span style={{ color }} className="opacity-70">{icon}</span>
        <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-semibold">{label}</p>
      </div>
      <p className="text-[26px] font-black text-white leading-none">
        {value.toFixed(value < 10 ? 1 : 0)}
        <span className="text-[13px] text-slate-600 font-normal ml-1">{unit}</span>
      </p>
      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}60`, transition: 'width 1.2s ease-out 300ms' }} />
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, format }: {
  active?: boolean; payload?: any[]; label?: any; format: (p: any, l: any) => React.ReactNode;
}) {
  if (!active || !payload?.length) return null;
  return <div className="bg-[#1a1a28] border border-white/[0.10] rounded-xl px-3.5 py-2.5 shadow-xl text-xs">{format(payload, label)}</div>;
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.14em]">{title}</p>
      {sub && <p className="text-[11px] text-slate-700 mt-0.5">{sub}</p>}
    </div>
  );
}

function TabBtn({ active, onClick, color, children }: { active: boolean; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.1em] transition-all"
      style={active
        ? { background: `${color}18`, border: `1px solid ${color}40`, color }
        : { background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#475569' }}>
      {children}
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AnalysisResultsView({
  result,
  displayName,
}: {
  result: IBTResult;
  displayName?: string;
}) {
  const { session, analysis } = result;
  const scores = analysis.scores;

  const [selectedLapIdx, setSelectedLapIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab]           = useState<Channel>('speed');
  const [compareLapA, setCompareLapA]       = useState(0);
  const [compareLapB, setCompareLapB]       = useState(1);
  const [compareTab, setCompareTab]         = useState<Channel>('speed');

  const laps = result.laps ?? [];

  useEffect(() => {
    if (laps.length > 0) {
      const bestIdx = laps.findIndex((l) => l.isBest);
      setSelectedLapIdx(bestIdx >= 0 ? bestIdx : 0);
      const validWithIdx = laps.map((l, i) => ({ ...l, idx: i })).filter((l) => l.lapTime > 0);
      if (validWithIdx.length >= 2) {
        const sorted = [...validWithIdx].sort((a, b) => a.lapTime - b.lapTime);
        setCompareLapA(sorted[0].idx);
        setCompareLapB(sorted[1].idx);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedLap = selectedLapIdx !== null ? (laps[selectedLapIdx] ?? null) : null;
  const lapAData    = compareLapA < laps.length ? laps[compareLapA] : null;
  const lapBData    = compareLapB < laps.length ? laps[compareLapB] : null;

  const insights         = useMemo(() => generateInsights(laps), [laps]);
  const selectedChartData = useMemo(() => selectedLap ? buildLapChartData(selectedLap, activeTab) : null, [selectedLap, activeTab]);
  const compareChartData  = useMemo(() => lapAData && lapBData ? buildCompareData(lapAData, lapBData, compareTab) : null, [lapAData, lapBData, compareTab]);

  const validLaps  = laps.filter((l) => l.lapTime > 0);
  const bestLap    = validLaps.find((l) => l.isBest);
  const worstLap   = validLaps.length > 0 ? validLaps.reduce((a, b) => a.lapTime > b.lapTime ? a : b) : null;
  const avgLapTime = validLaps.length > 0 ? validLaps.reduce((s, l) => s + l.lapTime, 0) / validLaps.length : 0;
  const lapStd     = clientStdDev(validLaps.map((l) => l.lapTime));
  const stdColor   = lapStd < 1 ? '#22c55e' : lapStd < 2 ? '#f59e0b' : '#e8143c';

  const metricList = [
    { key: 'smoothness'  as const, label: 'Smoothness',  score: scores.smoothness },
    { key: 'throttle'    as const, label: 'Throttle',    score: scores.throttleControl },
    { key: 'brake'       as const, label: 'Braking',     score: scores.brakeEfficiency },
    { key: 'consistency' as const, label: 'Consistency', score: scores.consistency },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 pb-12">

      {/* ── Best / Worst / Avg / Consistency highlights ─────────────────────── */}
      {validLaps.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#13131e] border border-[#22c55e]/20 rounded-2xl p-4 space-y-1">
            <p className="text-[10px] uppercase text-[#22c55e] tracking-[0.12em] font-bold">Best Lap</p>
            <p className="text-[20px] font-black text-white font-mono leading-none">{fmtLapTime(bestLap?.lapTime ?? -1)}</p>
            <p className="text-[11px] text-slate-600">Lap {bestLap?.lapNumber ?? '—'}</p>
          </div>
          <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-4 space-y-1">
            <p className="text-[10px] uppercase text-slate-600 tracking-[0.12em] font-bold">Worst Lap</p>
            <p className="text-[20px] font-black text-white font-mono leading-none">{fmtLapTime(worstLap?.lapTime ?? -1)}</p>
            <p className="text-[11px] text-slate-600">Lap {worstLap?.lapNumber ?? '—'}</p>
          </div>
          <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-4 space-y-1">
            <p className="text-[10px] uppercase text-slate-600 tracking-[0.12em] font-bold">Average</p>
            <p className="text-[20px] font-black text-white font-mono leading-none">{fmtLapTime(avgLapTime)}</p>
            <p className="text-[11px] text-slate-600">{validLaps.length} completed</p>
          </div>
          <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-4 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.12em] font-bold" style={{ color: stdColor }}>Consistency</p>
            <p className="text-[20px] font-black leading-none" style={{ color: stdColor }}>{lapStd > 0 ? `±${lapStd.toFixed(3)}s` : 'N/A'}</p>
            <p className="text-[11px] text-slate-600">{lapStd < 0.5 ? 'Excellent' : lapStd < 1 ? 'Good' : lapStd < 2 ? 'Decent' : 'Needs work'}</p>
          </div>
        </div>
      )}

      {/* ── Lap Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.14em]">Lap Performance</p>
            <p className="text-[11px] text-slate-700 mt-0.5">Click a row to view telemetry charts below</p>
          </div>
          {selectedLap && (
            <span className="text-[11px] text-[#e8143c] font-semibold">Lap {selectedLap.lapNumber} selected ↓</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Lap', 'Time', 'Gap', 'Avg Speed', 'Top Speed', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[10px] uppercase text-slate-600 tracking-[0.1em] font-semibold whitespace-nowrap first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {laps.map((lap, i) => {
                const isSelected   = selectedLapIdx === i;
                const isBest       = lap.isBest;
                const isIncomplete = lap.lapTime <= 0;
                return (
                  <tr key={lap.lapNumber}
                    onClick={() => setSelectedLapIdx(isSelected ? null : i)}
                    className={`border-b border-white/[0.03] cursor-pointer transition-colors ${isSelected ? 'bg-[#e8143c]/[0.06] hover:bg-[#e8143c]/[0.09]' : isBest ? 'bg-[#22c55e]/[0.03] hover:bg-[#22c55e]/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                    <td className="pl-5 pr-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-1 h-6 rounded-full flex-shrink-0 transition-colors ${isSelected ? 'bg-[#e8143c]' : isBest ? 'bg-[#22c55e]' : 'bg-transparent'}`} />
                        <span className={`text-[13px] font-bold ${isBest ? 'text-[#22c55e]' : isIncomplete ? 'text-slate-600' : 'text-white'}`}>{lap.lapNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-[13px] font-semibold ${isBest ? 'text-[#22c55e]' : isIncomplete ? 'text-slate-600' : 'text-white'}`}>{fmtLapTime(lap.lapTime)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isIncomplete ? <span className="text-slate-700 text-[12px]">—</span>
                        : lap.gap === 0 ? <span className="text-[#22c55e] text-[12px] font-bold">Best ★</span>
                        : <span className="font-mono text-[12px] font-semibold" style={{ color: gapColor(lap.gap) }}>+{lap.gap.toFixed(3)}</span>}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-400">{lap.avgSpeed > 0 ? `${Math.round(lap.avgSpeed)} km/h` : '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-400">{lap.topSpeed > 0 ? `${Math.round(lap.topSpeed)} km/h` : '—'}</td>
                    <td className="px-4 py-3">
                      {isIncomplete ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-[0.08em]">Incomplete</span>
                      ) : isBest ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-[10px] font-bold uppercase tracking-[0.08em]">Best</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-500 text-[10px] font-semibold uppercase tracking-[0.08em]">Valid</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Lap Charts ────────────────────────────────────────────────────────── */}
      <div className={`transition-all duration-300 ${selectedLap ? 'opacity-100' : 'opacity-40 pointer-events-none select-none'}`}>
        <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.14em]">
                Lap Analysis{selectedLap ? ` — Lap ${selectedLap.lapNumber}` : ''}
              </p>
              <p className="text-[11px] text-slate-700 mt-0.5">
                {selectedLap
                  ? `${fmtLapTime(selectedLap.lapTime)} · Avg ${Math.round(selectedLap.avgSpeed)} km/h · Top ${Math.round(selectedLap.topSpeed)} km/h`
                  : 'Select a lap from the table above'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CHANNEL_CONFIG) as Channel[]).map((ch) => (
                <TabBtn key={ch} active={activeTab === ch} color={CHANNEL_CONFIG[ch].color} onClick={() => setActiveTab(ch)}>
                  {CHANNEL_CONFIG[ch].label}
                </TabBtn>
              ))}
            </div>
          </div>

          {selectedChartData && selectedLap ? (() => {
            const cfg = CHANNEL_CONFIG[activeTab];
            return (
              <div>
                <div className="flex items-center gap-3 mb-3 text-[10px]">
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: cfg.color }}>
                    <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: cfg.color }} />
                    {cfg.label} ({cfg.unit})
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  {activeTab === 'steering' ? (
                    <LineChart data={selectedChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" horizontal vertical={false} />
                      <XAxis dataKey="pct" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `${v}%`} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={36} tickFormatter={(v: number) => `${v.toFixed(0)}°`} />
                      <Tooltip content={<ChartTooltip format={(p, l) => (<><p className="text-slate-500 mb-1">{l}% of lap</p><p className="font-semibold" style={{ color: cfg.color }}>{(p[0]?.value as number)?.toFixed(1)}°</p></>)} />} />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 3" />
                      <Line type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  ) : (
                    <AreaChart data={selectedChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`lapGrad_${activeTab}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={cfg.color} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={cfg.color} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" horizontal vertical={false} />
                      <XAxis dataKey="pct" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `${v}%`} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={36}
                        tickFormatter={(v: number) => activeTab === 'speed' ? `${Math.round(v)}` : `${Math.round(v)}%`} />
                      <Tooltip content={<ChartTooltip format={(p, l) => (<><p className="text-slate-500 mb-1">{l}% of lap</p><p className="font-semibold" style={{ color: cfg.color }}>{(p[0]?.value as number)?.toFixed(1)} {cfg.unit}</p></>)} />} />
                      <Area type="monotone" dataKey="value" stroke={cfg.color} fill={`url(#lapGrad_${activeTab})`} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            );
          })() : (
            <div className="flex items-center justify-center h-[200px] text-slate-700 text-[13px]">Select a lap row above to view telemetry charts</div>
          )}
        </div>
      </div>

      {/* ── Lap Comparison ────────────────────────────────────────────────────── */}
      {laps.length >= 2 && (
        <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.14em]">Lap Comparison</p>
              <p className="text-[11px] text-slate-700 mt-0.5">Overlaid by track position (LapDistPct)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CHANNEL_CONFIG) as Channel[]).map((ch) => (
                <TabBtn key={ch} active={compareTab === ch} color={CHANNEL_CONFIG[ch].color} onClick={() => setCompareTab(ch)}>
                  {CHANNEL_CONFIG[ch].label}
                </TabBtn>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 rounded-full bg-[#e8143c] inline-block shrink-0" />
              <select value={compareLapA} onChange={(e) => setCompareLapA(Number(e.target.value))}
                className="bg-[#0d0d18] border border-white/[0.10] rounded-xl text-white text-[12px] font-semibold px-3 py-1.5 outline-none hover:border-white/[0.20] transition-colors cursor-pointer">
                {laps.map((l, i) => (
                  <option key={i} value={i} className="bg-[#0d0d18]">Lap {l.lapNumber}{l.isBest ? ' ★ Best' : l.lapTime > 0 ? ` (${fmtLapTime(l.lapTime)})` : ' (Incomplete)'}</option>
                ))}
              </select>
            </div>
            <span className="text-slate-600 text-[12px]">vs</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 rounded-full bg-[#3b82f6] inline-block shrink-0" />
              <select value={compareLapB} onChange={(e) => setCompareLapB(Number(e.target.value))}
                className="bg-[#0d0d18] border border-white/[0.10] rounded-xl text-white text-[12px] font-semibold px-3 py-1.5 outline-none hover:border-white/[0.20] transition-colors cursor-pointer">
                {laps.map((l, i) => (
                  <option key={i} value={i} className="bg-[#0d0d18]">Lap {l.lapNumber}{l.isBest ? ' ★ Best' : l.lapTime > 0 ? ` (${fmtLapTime(l.lapTime)})` : ' (Incomplete)'}</option>
                ))}
              </select>
            </div>
            {lapAData && lapBData && lapAData.lapTime > 0 && lapBData.lapTime > 0 && (
              <div className="flex items-center gap-2 pl-3 border-l border-white/[0.06]">
                <span className="text-[11px] text-slate-600">Gap:</span>
                <span className="text-[12px] font-mono font-bold" style={{ color: gapColor(Math.abs(lapAData.lapTime - lapBData.lapTime)) }}>
                  {Math.abs(lapAData.lapTime - lapBData.lapTime).toFixed(3)}s
                </span>
              </div>
            )}
          </div>
          {compareChartData && lapAData && lapBData && (() => {
            const cfg = CHANNEL_CONFIG[compareTab];
            return (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  {compareTab === 'steering' ? (
                    <LineChart data={compareChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" horizontal vertical={false} />
                      <XAxis dataKey="pct" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `${v}%`} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={36} tickFormatter={(v: number) => `${v.toFixed(0)}°`} />
                      <Tooltip content={<ChartTooltip format={(p, l) => (<><p className="text-slate-500 mb-1">{l}% of lap</p>{(p as any[]).map((pt) => <p key={pt.dataKey} style={{ color: pt.color }} className="font-semibold">Lap {pt.dataKey === 'a' ? lapAData.lapNumber : lapBData.lapNumber}: {(pt.value as number)?.toFixed(1)}°</p>)}</>)} />} />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 3" />
                      <Line type="monotone" dataKey="a" stroke="#e8143c" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="b" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  ) : (
                    <AreaChart data={compareChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="compGradA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e8143c" stopOpacity={0.2} /><stop offset="100%" stopColor="#e8143c" stopOpacity={0.02} /></linearGradient>
                        <linearGradient id="compGradB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} /></linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.03)" horizontal vertical={false} />
                      <XAxis dataKey="pct" tick={{ fill: '#475569', fontSize: 10 }} tickFormatter={(v) => `${v}%`} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={36}
                        tickFormatter={(v: number) => compareTab === 'speed' ? `${Math.round(v)}` : `${Math.round(v)}%`} />
                      <Tooltip content={<ChartTooltip format={(p, l) => (<><p className="text-slate-500 mb-1">{l}% of lap</p>{(p as any[]).map((pt) => <p key={pt.dataKey} style={{ color: pt.color }} className="font-semibold">Lap {pt.dataKey === 'a' ? lapAData.lapNumber : lapBData.lapNumber}: {(pt.value as number)?.toFixed(1)} {cfg.unit}</p>)}</>)} />} />
                      <Area type="monotone" dataKey="a" stroke="#e8143c" fill="url(#compGradA)" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Area type="monotone" dataKey="b" stroke="#3b82f6" fill="url(#compGradB)" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.05]">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-3 h-0.5 rounded-full bg-[#e8143c] inline-block" />
                    <span className="text-slate-400 font-semibold">Lap {lapAData.lapNumber}</span>
                    {lapAData.lapTime > 0 && <span className="text-slate-600 font-mono">{fmtLapTime(lapAData.lapTime)}</span>}
                    {lapAData.isBest && <span className="text-[#22c55e] text-[10px] font-bold">★ Best</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-3 h-0.5 rounded-full bg-[#3b82f6] inline-block" />
                    <span className="text-slate-400 font-semibold">Lap {lapBData.lapNumber}</span>
                    {lapBData.lapTime > 0 && <span className="text-slate-600 font-mono">{fmtLapTime(lapBData.lapTime)}</span>}
                    {lapBData.isBest && <span className="text-[#22c55e] text-[10px] font-bold">★ Best</span>}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Session Insights ──────────────────────────────────────────────────── */}
      <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <SectionHeader title="Session Insights" />
        <div className="space-y-3">
          {insights.map((ins, i) => (
            <div key={i} className="relative overflow-hidden bg-[#0d0d18] border border-white/[0.05] rounded-2xl px-5 py-4">
              <div className="absolute top-0 left-0 w-1 h-full rounded-full"
                style={{ backgroundColor: ins.type === 'good' ? '#22c55e' : ins.type === 'warn' ? '#e8143c' : '#3b82f6' }} />
              <p className="text-slate-300 text-[13px] leading-relaxed pl-2">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Score + Metric rings ───────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5">
        <div className="lg:w-[30%] bg-[#13131e] border border-white/[0.07] rounded-2xl flex flex-col items-center justify-center py-8 px-6 gap-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
          <ScoreRing score={scores.total} size={148} />
          <div className="text-center space-y-0.5">
            <p className="text-[13px] font-semibold text-white">{session.driverName || displayName || ''}</p>
            <p className="text-[11px] text-slate-600">{session.trackDisplayName || session.trackName}</p>
          </div>
        </div>
        <div className="lg:w-[70%] grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metricList.map(({ key, label, score }) => (
            <MetricRingCard key={key} metricKey={key} label={label} score={score}
              interpretation={metricInterpretation(key, score, key === 'consistency' ? session.completedLapTimes.length : undefined)} />
          ))}
        </div>
      </div>

      {/* ── Performance gauges ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GaugeBarCard label="Top Speed"    value={analysis.topSpeed}          max={300} unit="km/h" color="#3b82f6" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10" /><polyline points="12 6 12 12 16 14" /></svg>} />
        <GaugeBarCard label="Avg Speed"    value={analysis.avgSpeed}          max={200} unit="km/h" color="#3b82f6" icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>} />
        <GaugeBarCard label="Avg Throttle" value={analysis.avgThrottle * 100} max={100} unit="%" color="#22c55e"   icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>} />
        <GaugeBarCard label="Avg Brake"    value={analysis.avgBrake * 100}    max={100} unit="%" color="#e8143c"   icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>} />
      </div>
    </div>
  );
}
