import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import CompareClient from '@/components/dashboard/CompareClient';
import type { IBTResult } from '@/lib/ibt-parser';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Session Comparison — Kaimann Racing Analytics' };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { a?: string; b?: string };
}) {
  const { a, b } = searchParams;
  if (!a || !b || a === b) redirect('/dashboard/sessions');

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { data: rows } = await service
    .from('race_results')
    .select('id, user_id, track_name, car_name, fastest_lap_ms, incidents, race_date, series_name, session_label, telemetry_json')
    .in('id', [a, b]);

  const rowA = rows?.find((r) => r.id === a);
  const rowB = rows?.find((r) => r.id === b);
  if (!rowA || !rowB) notFound();

  let resultA: IBTResult | null = null;
  let resultB: IBTResult | null = null;
  try { resultA = JSON.parse((rowA as any).telemetry_json || ''); } catch { /* no data */ }
  try { resultB = JSON.parse((rowB as any).telemetry_json || ''); } catch { /* no data */ }

  return (
    <CompareClient
      sessionA={rowA as any}
      sessionB={rowB as any}
      resultA={resultA}
      resultB={resultB}
    />
  );
}
