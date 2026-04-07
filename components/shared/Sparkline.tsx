'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { LineChart, Line } from 'recharts';

export default function Sparkline({
  values,
  color = '#22c55e',
}: {
  values: number[];
  color?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const HEIGHT = 36;

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

  const data = values.map((v) => ({ v }));

  return (
    <div ref={containerRef} style={{ width: '100%', height: HEIGHT }} className="min-w-0">
      {width >= 2 && (
        <LineChart
          width={width}
          height={HEIGHT}
          data={data}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
        >
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </div>
  );
}
