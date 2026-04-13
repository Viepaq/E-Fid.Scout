'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import type { AgeGroup } from '@/lib/database.types';

const AGE_GROUPS: Array<AgeGroup | 'all'> = ['all', 'U12', 'U15', 'U18', 'U21', '21+'];

type Props = {
  resultCount: number;
  defaults: {
    filter: string;
    ageGroup: string;
    minScore: number;
  };
};

export default function FilterBar({ resultCount, defaults }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === '' || value === 'all' || value === '0') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const selectCls =
    'w-full md:w-auto bg-[#1a1a1a] border border-[#333333] text-white text-sm rounded-lg px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent cursor-pointer';

  return (
    <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
      {/* Status filter */}
      <select
        defaultValue={defaults.filter}
        onChange={(e) => updateParam('filter', e.target.value)}
        className={selectCls}
      >
        <option value="all">All statuses</option>
        <option value="watchlist">Watch List</option>
        <option value="talent_pool">Talent Pool</option>
      </select>

      {/* Age group filter */}
      <select
        defaultValue={defaults.ageGroup}
        onChange={(e) => updateParam('ageGroup', e.target.value)}
        className={selectCls}
      >
        {AGE_GROUPS.map((ag) => (
          <option key={ag} value={ag}>
            {ag === 'all' ? 'All age groups' : ag}
          </option>
        ))}
      </select>

      {/* Min score */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-[#888888] whitespace-nowrap">Min score</label>
        <input
          type="number"
          min={0}
          max={100}
          defaultValue={defaults.minScore}
          onChange={(e) => updateParam('minScore', e.target.value)}
          className="flex-1 md:w-16 md:flex-none bg-[#1a1a1a] border border-[#333333] text-white text-sm rounded-lg px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:border-transparent"
        />
      </div>

      {/* Result count */}
      <span className="text-sm text-[#888888] md:ml-auto">
        Showing{' '}
        <span className="text-white font-medium">{resultCount}</span>{' '}
        driver{resultCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
