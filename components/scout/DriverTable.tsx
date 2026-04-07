'use client';

import { useRouter } from 'next/navigation';
import type { AgeGroup, ScoutingStatus } from '@/lib/database.types';

export type DriverRow = {
  userId: string;
  displayName: string;
  birthDate: string;
  ageGroup: AgeGroup | null;
  scoreTotal: number;
  scoreLearningRate: number;
  percentile: number | null;
  status: ScoutingStatus;
  previousTotal: number | null;
  rank: number;
};

function age(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let a = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
  return a;
}

function ScoreDot({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#888888';
  return (
    <span className="flex items-center gap-2">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="font-bold text-white">{score}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: ScoutingStatus }) {
  if (status === 'none' || status === 'qualifier_invited') return null;
  const map: Record<string, { cls: string; label: string }> = {
    watchlist:   { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',     label: 'Watch List' },
    talent_pool: { cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', label: 'Talent Pool' },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function Trend({ latest, prev }: { latest: number; prev: number | null }) {
  if (prev === null) return <span className="text-[#888888]">—</span>;
  const diff = latest - prev;
  if (diff >= 3)  return <span className="text-[#22c55e] text-sm font-medium">▲ +{diff}</span>;
  if (diff <= -3) return <span className="text-[#ef4444] text-sm font-medium">▼ {diff}</span>;
  return <span className="text-[#888888]">→</span>;
}

export default function DriverTable({ drivers }: { drivers: DriverRow[] }) {
  const router = useRouter();

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#222222]">
            {(['Rank', 'Name', 'Score', 'Status'] as const).map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wide whitespace-nowrap">
              Age
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wide whitespace-nowrap">
              Group
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wide whitespace-nowrap">
              Top %
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wide whitespace-nowrap">
              Trend
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1a1a1a]">
          {drivers.map((d) => (
            <tr
              key={d.userId}
              onClick={() => router.push(`/scout/${d.userId}`)}
              className="cursor-pointer hover:bg-white/[0.03] transition-colors"
            >
              <td className="px-4 py-3">
                <span className={`text-sm font-bold ${d.rank <= 3 ? 'text-[#22c55e]' : 'text-[#888888]'}`}>
                  #{d.rank}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                {d.displayName}
              </td>
              <td className="px-4 py-3">
                <ScoreDot score={d.scoreTotal} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={d.status} />
              </td>
              <td className="hidden md:table-cell px-4 py-3 text-[#888888]">{age(d.birthDate)}</td>
              <td className="hidden md:table-cell px-4 py-3 text-[#888888]">{d.ageGroup ?? '—'}</td>
              <td className="hidden md:table-cell px-4 py-3 text-[#888888] whitespace-nowrap">
                {d.percentile != null ? `Top ${100 - d.percentile}%` : '—'}
              </td>
              <td className="hidden md:table-cell px-4 py-3">
                <Trend latest={d.scoreTotal} prev={d.previousTotal} />
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(`/scout/${d.userId}`); }}
                  className="text-xs text-[#22c55e] hover:text-white border border-[#22c55e]/30 hover:border-white/30 rounded px-2 py-1 min-h-[44px] lg:min-h-0 flex items-center transition-colors whitespace-nowrap"
                >
                  View →
                </button>
              </td>
            </tr>
          ))}
          {drivers.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center text-[#888888] text-sm">
                No drivers match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
