import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import SessionDetailClient from '@/components/dashboard/SessionDetailClient';
import type { IBTResult } from '@/lib/ibt-parser';

export const dynamic = 'force-dynamic';

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { data: row } = await service
    .from('race_results')
    .select('id, user_id, track_name, car_name, fastest_lap_ms, incidents, race_date, series_name, telemetry_json, session_label')
    .eq('id', params.id)
    .single();

  if (!row || row.user_id !== user.id) notFound();

  let fullResult: IBTResult | null = null;
  if ((row as any).telemetry_json) {
    try { fullResult = JSON.parse((row as any).telemetry_json); } catch { /* ignore */ }
  }

  return <SessionDetailClient session={row as any} fullResult={fullResult} />;
}
