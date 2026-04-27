import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SidebarNav from './SidebarNav';
import type { UserRole } from '@/lib/database.types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single();

  const displayName = profile?.display_name ?? user.email ?? 'Driver';
  const role = (profile?.role ?? 'user') as UserRole;

  return (
    <div className="flex h-screen bg-[#0d0d18] overflow-hidden">
      <SidebarNav displayName={displayName} role={role} />
      <main className="flex-1 overflow-y-auto min-w-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
