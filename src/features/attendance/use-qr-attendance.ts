import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

import type { DbErrorCode } from '@/lib/db-errors';

import { attendanceKeys } from './queries';
import { submitAttendance } from './queue';

export type QrAttendanceState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'sending' }
  | { status: 'done'; kind: 'in' | 'out'; at: Date; queued: boolean }
  | { status: 'error'; code: DbErrorCode | 'location_denied' };

/**
 * Отметка по отсканированному QR: геолокация → событие в очередь (сразу на сервер, без сети —
 * на устройство). Сервер проверяет QR, запись и радиус.
 */
export function useQrAttendance(questId: string | null) {
  const client = useQueryClient();
  const [state, setState] = useState<QrAttendanceState>({ status: 'idle' });

  const run = useCallback(
    async (token: string, kind: 'in' | 'out') => {
      setState({ status: 'locating' });
      let lat: number | null = null;
      let lng: number | null = null;
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        // Для входа геолокация обязательна; для ухода — желательна.
        if (kind === 'in') {
          setState({ status: 'error', code: 'location_denied' });
          return;
        }
      } else {
        try {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          if (kind === 'in') {
            setState({ status: 'error', code: 'location_required' });
            return;
          }
        }
      }

      setState({ status: 'sending' });
      const at = new Date();
      const result = await submitAttendance(kind === 'in' ? 'check_in' : 'check_out', {
        token,
        lat,
        lng,
      });
      if (result.status === 'rejected') {
        setState({ status: 'error', code: result.code });
        return;
      }
      setState({ status: 'done', kind, at, queued: result.status === 'queued' });
      if (questId) void client.invalidateQueries({ queryKey: attendanceKeys.mine(questId) });
      void client.invalidateQueries({ queryKey: ['quests'] });
    },
    [client, questId],
  );

  return { state, run, reset: () => setState({ status: 'idle' }) };
}
