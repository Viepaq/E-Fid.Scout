import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import SessionsClient from '@/components/dashboard/SessionsClient';

export const dynamic = 'force-dynamic'; // never cache — data changes after every save

export const metadata = { title: 'Telemetry Sessions — Kaimann Racing Analytics' };

export default async function SessionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Use service client to bypass RLS — user identity already verified above
  const service = createServiceClient();
  const { data: rows, error } = await service
    .from('race_results')
    .select('id, track_name, car_name, fastest_lap_ms, incidents, race_date, series_name, session_label')
    .eq('user_id', user.id)
    .lt('iracing_subsession_id', 0)
    .order('race_date', { ascending: false });

  if (error) console.error('[sessions] query error:', error.message);

  return <SessionsClient sessions={rows ?? []} />;
}
