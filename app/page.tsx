import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LandingPageClient from './LandingPageClient';

export default async function LandingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return <LandingPageClient />;
}
