import { toDbError, unwrap } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

import type { NotificationRow, PushType } from './types';

export const NOTIFICATIONS_PAGE = 30;

export async function fetchNotifications(before: string | null): Promise<NotificationRow[]> {
  let query = supabase
    .from('notifications')
    .select('id, type, org_id, payload, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_PAGE);
  if (before) query = query.lt('created_at', before);
  const rows = unwrap(await query);
  return rows.map((row) => ({
    ...row,
    payload:
      typeof row.payload === 'object' && row.payload !== null && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
  }));
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw toDbError(error);
  return count ?? 0;
}

/** Отметить прочитанными: одно уведомление или все сразу. RLS пускает только к своим. */
export async function markRead(id?: string): Promise<void> {
  let query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (id) query = query.eq('id', id);
  unwrap(await query);
}

export async function fetchMutedTypes(userId: string): Promise<string[]> {
  const row = unwrap(
    await supabase
      .from('notification_preferences')
      .select('muted_types')
      .eq('user_id', userId)
      .maybeSingle(),
  );
  return row?.muted_types ?? [];
}

export async function saveMutedTypes(userId: string, muted: PushType[]): Promise<void> {
  unwrap(
    await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, muted_types: muted }, { onConflict: 'user_id' }),
  );
}

export async function registerPushToken(token: string, platform: 'ios' | 'android') {
  unwrap(await supabase.rpc('register_push_token', { p_token: token, p_platform: platform }));
}

export async function unregisterPushToken(token: string) {
  unwrap(await supabase.rpc('unregister_push_token', { p_token: token }));
}
