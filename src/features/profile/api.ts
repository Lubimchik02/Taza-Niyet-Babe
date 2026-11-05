import type { Tables } from '@/lib/db';
import { unwrap } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

export type Profile = Pick<Tables<'profiles'>, 'id' | 'full_name' | 'hide_from_leaderboard'>;

export async function fetchProfile(userId: string): Promise<Profile | null> {
  return unwrap(
    await supabase
      .from('profiles')
      .select('id, full_name, hide_from_leaderboard')
      .eq('id', userId)
      .maybeSingle(),
  );
}

export async function updateFullName(userId: string, fullName: string): Promise<void> {
  unwrap(await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId));
}
