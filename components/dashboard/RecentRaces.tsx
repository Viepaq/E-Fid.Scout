import type { RaceResult } from '@/lib/database.types';

type Props = {
  raceResults: RaceResult[];
};

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function PositionBadge({ pos }: { pos: number | null }) {
  if (pos == null) return <span className="text-slate-600">—</span>;

  const cls =
    pos === 1 ? 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/25' :
    pos === 2 ? 'text-slate-300 bg-white/[0.05] border-white/[0.12]' :
    pos === 3 ? 'text-[#cd7c32] bg-[#cd7c32]/10 border-[#cd7c32]/25' :
    pos <= 5  ? 'text-slate-300 bg-white/[0.04] border-white/[0.08]' :
    'text-slate-500 border-transparent';

  return (
    <span className={`inline-flex items-center justify-center min-w-[40px] px-2 py-0.5 rounded-lg text-[11px] font-bold border ${cls}`}>
      {ordinal(pos)}
    </span>
  );
}

function IRatingDelta({ before, after }: { before: number | null; after: number | null }) {
  if (before == null || after == null) return <span className="text-slate-700">—</span>;
  const delta = after - before;
  if (delta > 0) return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#22c55e]">
      <span className="text-[9px]">▲</span>+{delta}
    </span>
  );
  if (delta < 0) return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#e8143c]">
      <span className="text-[9px]">▼</span>{delta}
    </span>
  );
  return <span className="text-[11px] text-slate-600">0</span>;
}

function IncidentsBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-slate-700 text-[11px]">—</span>;
  if (count >= 4) return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold text-[#e8143c] bg-[#e8143c]/10 border border-[#e8143c]/20">
      {count}x
    </span>
  );
  if (count >= 2) return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20">
      {count}x
    </span>
  );
  return <span className="text-[11px] text-slate-400">{count}x</span>;
}

export default function RecentRaces({ raceResults }: Props) {
  if (raceResults.length === 0) {
    return (
      <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl p-8 text-center">
        <p className="text-slate-600 text-sm">No races recorded yet.</p>
        <p className="text-slate-700 text-xs mt-1">Races will appear here after your next session.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#13131e] border border-white/[0.07] rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {(['Date', 'Track', 'Finish', 'iR Δ', 'Inc.'] as const).map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-[0.12em] whitespace-nowrap"
              >
                {h}
              </th>
            ))}
            <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-[0.12em] whitespace-nowrap">
              Car
            </th>
          </tr>
        </thead>
        <tbody>
          {raceResults.map((race, i) => (
            <tr
              key={race.id}
              className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${i % 2 === 0 ? '' : 'bg-white/[0.015]'}`}
            >
              <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap text-[12px]">
                {formatDate(race.race_date)}
              </td>
              <td className="px-4 py-3.5 text-slate-200 truncate max-w-[110px] lg:max-w-[130px] text-[12px] font-medium">
                {race.track_name ?? '—'}
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap">
                <PositionBadge pos={race.finish_position} />
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap">
                <IRatingDelta before={race.irating_before} after={race.irating_after} />
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap">
                <IncidentsBadge count={race.incidents} />
              </td>
              <td className="hidden md:table-cell px-4 py-3.5 text-slate-600 whitespace-nowrap text-[11px]">
                {race.car_name ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
