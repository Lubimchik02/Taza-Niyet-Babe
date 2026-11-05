import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export const questKeys = {
  all: ['quests'] as const,
  feed: () => ['quests', 'feed'] as const,
  detail: (questId: string) => ['quests', questId] as const,
  participants: (questId: string) => ['quests', questId, 'participants'] as const,
  mine: () => ['quests', 'mine'] as const,
  skills: () => ['skills'] as const,
  orgTimeZone: (orgId: string) => ['organizations', orgId, 'timezone'] as const,
  photo: (path: string) => ['quest-photo', path] as const,
};

export function useQuestFeed() {
  return useQuery({ queryKey: questKeys.feed(), queryFn: api.fetchFeed });
}

export function useQuest(questId: string) {
  return useQuery({ queryKey: questKeys.detail(questId), queryFn: () => api.fetchQuest(questId) });
}

export function useParticipants(questId: string, enabled: boolean) {
  return useQuery({
    queryKey: questKeys.participants(questId),
    queryFn: () => api.fetchParticipants(questId),
    enabled,
  });
}

export function useMyQuests() {
  return useQuery({ queryKey: questKeys.mine(), queryFn: api.fetchMyQuests });
}

export function useSkills() {
  return useQuery({ queryKey: questKeys.skills(), queryFn: api.fetchSkills, staleTime: Infinity });
}

export function useOrgTimeZone(orgId: string) {
  return useQuery({
    queryKey: questKeys.orgTimeZone(orgId),
    queryFn: () => api.fetchOrgTimeZone(orgId),
    enabled: orgId !== '',
    staleTime: Infinity,
  });
}

/** Подписанная ссылка на фото живёт час; обновляем раньше. */
export function useQuestPhotoUrl(path: string | null) {
  return useQuery({
    queryKey: questKeys.photo(path ?? ''),
    queryFn: () => api.signedPhotoUrl(path ?? ''),
    enabled: path !== null && path !== '',
    staleTime: 50 * 60 * 1000,
  });
}

function useInvalidateQuests() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: questKeys.all });
}

export function useSignUp() {
  const invalidate = useInvalidateQuests();
  return useMutation({ mutationFn: api.signUp, onSuccess: invalidate });
}

export function useCancelSignUp() {
  const invalidate = useInvalidateQuests();
  return useMutation({ mutationFn: api.cancelSignUp, onSuccess: invalidate });
}

export function useSaveQuest() {
  const invalidate = useInvalidateQuests();
  return useMutation({ mutationFn: api.saveQuest, onSuccess: invalidate });
}
