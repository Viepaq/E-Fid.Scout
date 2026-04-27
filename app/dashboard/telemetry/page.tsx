import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TelemetryClient from '@/components/dashboard/TelemetryClient';

export const metadata = { title: 'Telemetry Analysis — Kaimann Racing Analytics' };

export default async function TelemetryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const displayName = profile?.display_name ?? user.email ?? 'Driver';

  return <TelemetryClient userId={user.id} displayName={displayName} />;
}
