'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
    <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-[#888888]">{label}</p>
      <p className="text-white font-semibold">{payload[0].value} iR</p>
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
      <div className="h-40 lg:h-[220px] flex items-center justify-center text-sm text-[#666666] px-4 text-center">
        No iRating history in the last 90 days. Connect iRacing or sync data to see your trend here.
      </div>
    );
  }

  const values = data.map((d) => d.irating);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  const padding = spread === 0 ? 80 : Math.max(50, Math.round(spread * 0.1));
  const domain: [number, number] = [min - padding, max + padding];
  const tickInterval = Math.max(1, Math.floor(data.length / 12));

  const ready = dims.width >= 2 && dims.height >= 2;

  return (
    <div
      ref={containerRef}
      className="h-40 lg:h-[220px] w-full min-h-[160px] min-w-[0]"
    >
      {!ready ? (
        <div className="h-full w-full animate-pulse rounded bg-[#1a1a1a]/80" aria-hidden />
      ) : (
        <LineChart
          width={dims.width}
          height={dims.height}
          data={data}
          margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid stroke="#222222" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#888888', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            domain={domain}
            tick={{ fill: '#888888', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333333' }} />
          <Line
            type="monotone"
            dataKey="irating"
            stroke="#e8143c"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#e8143c', strokeWidth: 0 }}
          />
        </LineChart>
      )}
    </div>
  );
}
