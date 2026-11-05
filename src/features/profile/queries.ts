import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-store';

import * as api from './api';

export const profileKeys = {
  me: (userId: string) => ['profile', userId] as const,
};

export function useMyProfile() {
  const userId = useSession((s) => s.session?.user.id) ?? '';
  return useQuery({
    queryKey: profileKeys.me(userId),
    queryFn: () => api.fetchProfile(userId),
    enabled: userId !== '',
  });
}

export function useUpdateFullName() {
  const userId = useSession((s) => s.session?.user.id) ?? '';
  const client = useQueryClient();
  return useMutation({
    mutationFn: (fullName: string) => api.updateFullName(userId, fullName),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: profileKeys.me(userId) }),
        // Имя показывается в списках участников и заявок.
        client.invalidateQueries({ queryKey: ['organizations'] }),
      ]),
  });
}
