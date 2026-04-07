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
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function IRatingDelta({
  before,
  after,
}: {
  before: number | null;
  after: number | null;
}) {
  if (before == null || after == null) {
    return <span className="text-[#888888]">—</span>;
  }
  const delta = after - before;
  if (delta > 0)
    return <span className="text-[#22c55e] font-medium">+{delta}</span>;
  if (delta < 0)
    return <span className="text-[#ef4444] font-medium">{delta}</span>;
  return <span className="text-[#888888]">0</span>;
}

function Incidents({ count }: { count: number }) {
  if (count === 0) return <span className="text-[#888888]">—</span>;
  if (count >= 3) return <span className="text-[#ef4444]">{count}</span>;
  return <span className="text-white">{count}</span>;
}

export default function RecentRaces({ raceResults }: Props) {
  if (raceResults.length === 0) {
    return (
      <div className="bg-[#111111] border border-[#222222] rounded-xl p-6 text-center text-[#888888] text-sm">
        No races recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-[#111111] border border-[#222222] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#222222]">
            {(['Date', 'Track', 'Finish', 'iR Δ', 'Inc.'] as const).map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-[#888888] uppercase tracking-wide whitespace-nowrap">
              Car
            </th>
          </tr>
        </thead>
        <tbody>
          {raceResults.map((race, i) => (
            <tr
              key={race.id}
              className={i % 2 === 0 ? 'bg-[#111111]' : 'bg-[#0f0f0f]'}
            >
              <td className="px-4 py-3 text-[#888888] whitespace-nowrap">
                {formatDate(race.race_date)}
              </td>
              <td className="px-4 py-3 text-white truncate max-w-[120px] lg:max-w-[140px]">
                {race.track_name ?? '—'}
              </td>
              <td className="px-4 py-3 text-white whitespace-nowrap font-medium">
                {race.finish_position != null ? ordinal(race.finish_position) : '—'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <IRatingDelta before={race.irating_before} after={race.irating_after} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Incidents count={race.incidents} />
              </td>
              <td className="hidden md:table-cell px-4 py-3 text-[#888888] whitespace-nowrap">
                {race.car_name ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
