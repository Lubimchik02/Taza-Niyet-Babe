import type { Json } from '@/lib/database.types';
import { unwrap } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

import type { AttendanceEvent, EventSender } from './offline-queue';

export type ShiftRow = Awaited<ReturnType<typeof fetchShiftSummary>>[number];

export interface SessionInfo {
  id: string;
  check_in_at: string;
  check_out_at: string | null;
  check_in_method: 'qr' | 'manual' | 'auto';
  check_out_method: 'qr' | 'manual' | 'auto' | null;
  status: 'active' | 'closed' | 'needs_confirmation' | 'confirmed';
  offline: boolean;
}

export interface ConfirmationInfo {
  id: string;
  confirmed_minutes: number;
  rating_quality: number;
  rating_activity: number;
  rating_teamwork: number;
  comment: string;
  confirmed_at: string;
  confirmed_by_name?: string | null;
}

export interface AdjustmentInfo {
  field: 'check_in_at' | 'check_out_at' | 'confirmed_minutes';
  old_value: string | null;
  new_value: string;
  reason: string;
  created_at: string;
}

export async function startShift(questId: string) {
  return unwrap(await supabase.rpc('start_shift', { p_quest_id: questId }));
}

export async function finishShift(questId: string) {
  return unwrap(await supabase.rpc('finish_shift', { p_quest_id: questId }));
}

/** Пачка подписанных токенов на ближайший час — QR будет работать и без сети. */
export async function fetchShiftQrBatch(questId: string, windows = 120) {
  return unwrap(await supabase.rpc('get_shift_qr', { p_quest_id: questId, p_windows: windows }));
}

export async function fetchShiftSummary(questId: string) {
  const rows = unwrap(await supabase.rpc('shift_summary', { p_quest_id: questId }));
  return rows.map((r) => ({
    ...r,
    sessions: r.sessions as unknown as SessionInfo[],
    confirmation: r.confirmation as unknown as ConfirmationInfo | null,
  }));
}

export async function fetchMyAttendance(questId: string) {
  const rows = unwrap(await supabase.rpc('my_quest_attendance', { p_quest_id: questId }));
  const row = rows[0];
  if (!row) return null;
  return {
    sessions: row.sessions as unknown as SessionInfo[],
    rawMinutes: Number(row.raw_minutes),
    roundedMinutes: row.rounded_minutes,
    confirmation: row.confirmation as unknown as ConfirmationInfo | null,
    adjustments: row.adjustments as unknown as AdjustmentInfo[],
  };
}

export async function adjustSession(input: {
  sessionId: string;
  checkInAt: string;
  checkOutAt: string;
  reason: string;
}) {
  return unwrap(
    await supabase.rpc('adjust_session', {
      p_session_id: input.sessionId,
      p_check_in_at: input.checkInAt,
      p_check_out_at: input.checkOutAt,
      p_reason: input.reason,
    }),
  );
}

export interface ConfirmItem {
  user_id: string;
  minutes: number;
  reason?: string;
  rating_quality: number;
  rating_activity: number;
  rating_teamwork: number;
  comment: string;
}

export async function confirmHours(questId: string, items: ConfirmItem[]) {
  return unwrap(
    await supabase.rpc('confirm_hours', {
      p_quest_id: questId,
      p_items: items as unknown as Json,
    }),
  );
}

/** Отправка события очереди на сервер. deviceTime — только для событий, ждавших сети. */
export const sendAttendanceEvent: EventSender = async (event: AttendanceEvent, deviceTime) => {
  const time = deviceTime ?? undefined;
  const { token, lat, lng, questId, userId } = event.payload;
  switch (event.kind) {
    case 'check_in':
      return unwrap(
        await supabase.rpc('check_in', {
          p_token: token ?? '',
          p_lat: lat ?? (null as unknown as number),
          p_lng: lng ?? (null as unknown as number),
          p_client_event_id: event.id,
          p_device_time: time,
        }),
      );
    case 'check_out':
      return unwrap(
        await supabase.rpc('check_out', {
          p_token: token ?? '',
          p_lat: lat ?? (null as unknown as number),
          p_lng: lng ?? (null as unknown as number),
          p_client_event_id: event.id,
          p_device_time: time,
        }),
      );
    case 'manual_check_in':
      return unwrap(
        await supabase.rpc('manual_check_in', {
          p_quest_id: questId ?? '',
          p_user_id: userId ?? '',
          p_client_event_id: event.id,
          p_device_time: time,
        }),
      );
    case 'manual_check_out':
      return unwrap(
        await supabase.rpc('manual_check_out', {
          p_quest_id: questId ?? '',
          p_user_id: userId ?? '',
          p_client_event_id: event.id,
          p_device_time: time,
        }),
      );
  }
};
