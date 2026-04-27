'use server';

import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function renameSession(id: string, label: string): Promise<{ success: true }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = createServiceClient();

  const { data: row } = await service
    .from('race_results')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!row || row.user_id !== user.id) throw new Error('Not found');

  const { error } = await service
    .from('race_results')
    .update({ session_label: label.trim() || null } as any)
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/sessions');
  return { success: true };
}

export async function deleteSession(id: string): Promise<{ success: true }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const service = createServiceClient();

  // Verify ownership before deleting
  const { data: row } = await service
    .from('race_results')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!row || row.user_id !== user.id) throw new Error('Not found');

  const { error } = await service
    .from('race_results')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/sessions');
  return { success: true };
}
