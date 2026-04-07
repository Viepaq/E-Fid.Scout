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
  score_total: number;
  calculated_at: string;
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
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
      <p className="text-white font-semibold">Score: {payload[0].value}</p>
    </div>
  );
}

export default function ScoreTrendChart({ scores }: { scores: DataPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const HEIGHT = 160;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function measure() {
      const node = containerRef.current;
      if (!node) return;
      const w = Math.floor(node.getBoundingClientRect().width);
      if (w >= 2) setWidth((prev) => (prev === w ? prev : w));
    }
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = [...scores]
    .sort((a, b) => a.calculated_at.localeCompare(b.calculated_at))
    .map((s) => ({ date: fmt(s.calculated_at), score: s.score_total }));

  return (
    <div ref={containerRef} style={{ width: '100%', height: HEIGHT }} className="min-w-0">
      {width >= 2 && (
        <LineChart
          width={width}
          height={HEIGHT}
          data={data}
          margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid stroke="#222222" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#888888', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={Math.max(0, Math.floor(data.length / 8) - 1)}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#888888', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333333' }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
          />
        </LineChart>
      )}
    </div>
  );
}
