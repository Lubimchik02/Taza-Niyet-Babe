import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

import * as api from './api';

export const attendanceKeys = {
  all: ['attendance'] as const,
  summary: (questId: string) => ['attendance', questId, 'summary'] as const,
  mine: (questId: string) => ['attendance', questId, 'mine'] as const,
  qr: (questId: string) => ['attendance', questId, 'qr'] as const,
};

export function useShiftSummary(questId: string, enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.summary(questId),
    queryFn: () => api.fetchShiftSummary(questId),
    enabled,
  });
}

export function useMyAttendance(questId: string, enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.mine(questId),
    queryFn: () => api.fetchMyAttendance(questId),
    enabled,
  });
}

/** Пачка токенов на час: докачивается за 10 минут до конца; при обрыве сети остаются старые. */
export function useShiftQrBatch(questId: string, enabled: boolean) {
  return useQuery({
    queryKey: attendanceKeys.qr(questId),
    queryFn: () => api.fetchShiftQrBatch(questId),
    enabled,
    staleTime: 50 * 60 * 1000,
    refetchInterval: 50 * 60 * 1000,
    retry: 1,
  });
}

/** Присутствующие в реальном времени: любое изменение отметок квеста обновляет таблицу смены. */
export function useLiveShift(questId: string, enabled: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel(`shift-${questId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_sessions',
          filter: `quest_id=eq.${questId}`,
        },
        () => void client.invalidateQueries({ queryKey: attendanceKeys.summary(questId) }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [client, questId, enabled]);
}

function useInvalidateAttendance() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: attendanceKeys.all }),
      client.invalidateQueries({ queryKey: ['quests'] }),
    ]);
}

export function useStartShift() {
  const invalidate = useInvalidateAttendance();
  return useMutation({ mutationFn: api.startShift, onSuccess: invalidate });
}

export function useFinishShift() {
  const invalidate = useInvalidateAttendance();
  return useMutation({ mutationFn: api.finishShift, onSuccess: invalidate });
}

export function useAdjustSession() {
  const invalidate = useInvalidateAttendance();
  return useMutation({ mutationFn: api.adjustSession, onSuccess: invalidate });
}

export function useConfirmHours() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: ({ questId, items }: { questId: string; items: api.ConfirmItem[] }) =>
      api.confirmHours(questId, items),
    onSuccess: invalidate,
  });
}
