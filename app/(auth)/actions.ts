'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type AuthState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function register(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const displayName = (formData.get('display_name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;
  const birthDate = formData.get('birth_date') as string;

  const fieldErrors: Record<string, string> = {};

  if (!displayName || displayName.length < 2)
    fieldErrors.display_name = 'At least 2 characters required';
  if (!email) fieldErrors.email = 'Email is required';
  if (!password || password.length < 8)
    fieldErrors.password = 'At least 8 characters required';
  if (!birthDate) fieldErrors.birth_date = 'Date of birth is required';

  if (Object.keys(fieldErrors).length > 0) return { error: null, fieldErrors };

  const supabase = createClient();

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  if (signUpError) return { error: signUpError.message };

  const userId = data.user?.id;
  if (!userId) return { error: 'Registration failed. Please try again.' };

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    display_name: displayName,
    birth_date: birthDate,
    role: 'user',
  });

  if (profileError) return { error: profileError.message };

  await supabase.from('scouting_status').insert({
    user_id: userId,
    status: 'none',
  });

  redirect('/select');
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: 'Invalid email or password' };

  redirect('/select');
}
