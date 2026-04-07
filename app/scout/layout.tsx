import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import ScoutSidebarNav from './ScoutSidebarNav';

export default async function ScoutLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const db = createServiceClient();
  const { data: profile } = await db
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();

  const displayName = (profile as { display_name: string } | null)?.display_name ?? user.email ?? 'Scout';

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <ScoutSidebarNav displayName={displayName} />
      <main className="flex-1 overflow-y-auto min-w-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
