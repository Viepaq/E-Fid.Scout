'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type DataPoint = {
  irating_value: number;
  recorded_at: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a28] border border-white/[0.10] rounded-xl px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-slate-100 font-bold text-sm">{payload[0].value.toLocaleString()} <span className="text-slate-500 font-normal text-xs">iR</span></p>
    </div>
  );
}

export default function IratingChart({ iRatingHistory }: { iRatingHistory: DataPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  const data = iRatingHistory.map((p) => ({
    date: formatDate(p.recorded_at),
    irating: p.irating_value,
  }));

  useLayoutEffect(() => {
    if (data.length === 0) return;
    const el = containerRef.current;
    if (!el) return;

    function measure() {
      const node = containerRef.current;
      if (!node) return;
      const { width, height } = node.getBoundingClientRect();
      const w = Math.floor(width);
      const h = Math.floor(height);
      if (w >= 2 && h >= 2) {
        setDims((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      }
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [data.length]);

  if (data.length === 0) {
    return (
      <div className="h-44 lg:h-[220px] flex flex-col items-center justify-center gap-2 text-center px-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <p className="text-sm text-slate-600">No iRating history in the last 90 days.</p>
        <p className="text-xs text-slate-700">Connect iRacing or sync data to see your trend here.</p>
      </div>
    );
  }

  const values = data.map((d) => d.irating);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  const padding = spread === 0 ? 80 : Math.max(50, Math.round(spread * 0.12));
  const domain: [number, number] = [min - padding, max + padding];
  const tickInterval = Math.max(1, Math.floor(data.length / 10));

  const ready = dims.width >= 2 && dims.height >= 2;

  return (
    <div
      ref={containerRef}
      className="h-44 lg:h-[220px] w-full min-h-[176px] min-w-[0]"
    >
      {!ready ? (
        <div className="h-full w-full animate-pulse rounded-xl bg-white/[0.02]" aria-hidden />
      ) : (
        <AreaChart
          width={dims.width}
          height={dims.height}
          data={data}
          margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="iratingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8143c" stopOpacity={0.18} />
              <stop offset="75%" stopColor="#e8143c" stopOpacity={0.03} />
              <stop offset="100%" stopColor="#e8143c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="rgba(255,255,255,0.03)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            domain={domain}
            tick={{ fill: '#475569', fontSize: 10, fontFamily: 'inherit' }}
            axisLine={false}
            tickLine={false}
            width={52}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="irating"
            stroke="#e8143c"
            strokeWidth={2}
            fill="url(#iratingGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#e8143c', strokeWidth: 2, stroke: '#13131e' }}
          />
        </AreaChart>
      )}
    </div>
  );
}
