import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-store';
import type { OrgRole } from '@/lib/db';

import * as api from './api';

export const orgKeys = {
  all: ['organizations'] as const,
  mine: (userId: string) => ['organizations', 'mine', userId] as const,
  detail: (orgId: string) => ['organizations', orgId] as const,
  members: (orgId: string) => ['organizations', orgId, 'members'] as const,
  invites: (orgId: string) => ['organizations', orgId, 'invites'] as const,
  invite: (inviteId: string) => ['invites', inviteId] as const,
  requests: (orgId: string) => ['organizations', orgId, 'requests'] as const,
  myRequests: (userId: string) => ['join-requests', 'mine', userId] as const,
  search: (query: string) => ['organizations', 'search', query] as const,
  invitePreview: (code: string) => ['invite-preview', code] as const,
};

function useUserId(): string {
  return useSession((s) => s.session?.user.id) ?? '';
}

export function useMyOrganizations() {
  const userId = useUserId();
  return useQuery({
    queryKey: orgKeys.mine(userId),
    queryFn: () => api.fetchMyOrganizations(userId),
    enabled: userId !== '',
  });
}

/** Роль текущего пользователя в организации (undefined — не участник или ещё грузится). */
export function useMyRole(orgId: string): OrgRole | undefined {
  return useMyOrganizations().data?.find((o) => o.id === orgId)?.role;
}

export function useOrganization(orgId: string) {
  return useQuery({ queryKey: orgKeys.detail(orgId), queryFn: () => api.fetchOrganization(orgId) });
}

export function useOrgMembers(orgId: string) {
  return useQuery({ queryKey: orgKeys.members(orgId), queryFn: () => api.fetchOrgMembers(orgId) });
}

export function useActiveInvites(orgId: string, enabled: boolean) {
  return useQuery({
    queryKey: orgKeys.invites(orgId),
    queryFn: () => api.fetchActiveInvites(orgId),
    enabled,
  });
}

export function useInvite(inviteId: string) {
  return useQuery({ queryKey: orgKeys.invite(inviteId), queryFn: () => api.fetchInvite(inviteId) });
}

export function useJoinRequests(orgId: string, enabled: boolean) {
  return useQuery({
    queryKey: orgKeys.requests(orgId),
    queryFn: () => api.fetchJoinRequests(orgId),
    enabled,
  });
}

export function useMyPendingRequests() {
  const userId = useUserId();
  return useQuery({
    queryKey: orgKeys.myRequests(userId),
    queryFn: () => api.fetchMyPendingRequests(userId),
    enabled: userId !== '',
  });
}

export function useOrgSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: orgKeys.search(trimmed),
    queryFn: () => api.searchOrganizations(trimmed),
    enabled: trimmed.length >= 2,
    staleTime: 10_000,
  });
}

export function useInvitePreview(code: string) {
  return useQuery({
    queryKey: orgKeys.invitePreview(code),
    queryFn: () => api.fetchInvitePreview(code),
    retry: false,
  });
}

// ------------------------------------------------------------------------------------------
// Мутации: после изменения инвалидируем всё, что касается организаций.
// ------------------------------------------------------------------------------------------
function useInvalidateOrgs() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: orgKeys.all }),
      client.invalidateQueries({ queryKey: ['join-requests'] }),
      client.invalidateQueries({ queryKey: ['invites'] }),
    ]);
}

export function useCreateOrganization() {
  const invalidate = useInvalidateOrgs();
  return useMutation({ mutationFn: api.createOrganization, onSuccess: invalidate });
}

export function useAcceptInvite() {
  const invalidate = useInvalidateOrgs();
  return useMutation({ mutationFn: api.acceptInvite, onSuccess: invalidate });
}

export function useRequestToJoin() {
  const invalidate = useInvalidateOrgs();
  return useMutation({
    mutationFn: ({ orgId, message }: { orgId: string; message: string }) =>
      api.requestToJoin(orgId, message),
    onSuccess: invalidate,
  });
}

export function useDecideJoinRequest() {
  const invalidate = useInvalidateOrgs();
  return useMutation({
    mutationFn: ({ requestId, approve }: { requestId: string; approve: boolean }) =>
      api.decideJoinRequest(requestId, approve),
    onSuccess: invalidate,
  });
}

export function useSetMemberRole() {
  const invalidate = useInvalidateOrgs();
  return useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: OrgRole }) =>
      api.setMemberRole(membershipId, role),
    onSuccess: invalidate,
  });
}

export function useRemoveMember() {
  const invalidate = useInvalidateOrgs();
  return useMutation({ mutationFn: api.removeMember, onSuccess: invalidate });
}

export function useCreateInvite() {
  const invalidate = useInvalidateOrgs();
  return useMutation({
    mutationFn: ({
      orgId,
      role,
    }: {
      orgId: string;
      role: Extract<OrgRole, 'volunteer' | 'coordinator'>;
    }) => api.createInvite(orgId, role),
    onSuccess: invalidate,
  });
}

export function useRevokeInvite() {
  const invalidate = useInvalidateOrgs();
  return useMutation({ mutationFn: api.revokeInvite, onSuccess: invalidate });
}
