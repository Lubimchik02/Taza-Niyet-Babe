import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-store';

import * as api from './api';

export const benefitKeys = {
  all: ['benefit'] as const,
  summary: () => ['benefit', 'summary'] as const,
  hours: (period: api.HoursPeriod) => ['benefit', 'hours', period] as const,
  leaderboard: (orgId: string, period: api.LeaderboardPeriod) =>
    ['benefit', 'leaderboard', orgId, period] as const,
};

export function useBenefit() {
  return useQuery({ queryKey: benefitKeys.summary(), queryFn: api.fetchBenefit });
}

export function useHours(period: api.HoursPeriod) {
  return useQuery({ queryKey: benefitKeys.hours(period), queryFn: () => api.fetchHours(period) });
}

export function useLeaderboard(orgId: string, period: api.LeaderboardPeriod) {
  return useQuery({
    queryKey: benefitKeys.leaderboard(orgId, period),
    queryFn: () => api.fetchLeaderboard(orgId, period),
  });
}

export function useHideFromLeaderboard() {
  const userId = useSession((s) => s.session?.user.id) ?? '';
  const client = useQueryClient();
  return useMutation({
    mutationFn: (hide: boolean) => api.setHideFromLeaderboard(userId, hide),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: benefitKeys.all }),
        client.invalidateQueries({ queryKey: ['profile'] }),
      ]),
  });
}

export function useSetContribution() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { questId: string; bags: number | null; area: number | null }) =>
      api.setQuestContribution(input.questId, input.bags, input.area),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: ['quests'] }),
        client.invalidateQueries({ queryKey: benefitKeys.all }),
      ]),
  });
}

export function useQuestContribution(questId: string) {
  return useQuery({
    queryKey: ['quests', questId, 'contribution'],
    queryFn: () => api.fetchQuestContribution(questId),
  });
}
