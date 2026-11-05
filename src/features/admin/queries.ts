import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';

export const adminKeys = {
  all: ['admin'] as const,
  disputes: (orgId: string) => ['admin', orgId, 'disputes'] as const,
  myDispute: (confirmationId: string) => ['disputes', 'mine', confirmationId] as const,
  tasks: (orgId: string) => ['admin', orgId, 'tasks'] as const,
  task: (taskId: string) => ['admin', 'task', taskId] as const,
  audit: (orgId: string) => ['admin', orgId, 'audit'] as const,
  report: (orgId: string, from: string, to: string) =>
    ['admin', orgId, 'report', from, to] as const,
  certificates: (orgId: string) => ['admin', orgId, 'certificates'] as const,
};

export function useDisputes(orgId: string) {
  return useQuery({ queryKey: adminKeys.disputes(orgId), queryFn: () => api.fetchDisputes(orgId) });
}

export function useResolveDispute() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.resolveDispute,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: adminKeys.all }),
        client.invalidateQueries({ queryKey: ['benefit'] }),
        client.invalidateQueries({ queryKey: ['attendance'] }),
      ]),
  });
}

export function useMyDispute(confirmationId: string | null) {
  return useQuery({
    queryKey: adminKeys.myDispute(confirmationId ?? ''),
    queryFn: () => api.fetchMyDispute(confirmationId ?? ''),
    enabled: confirmationId !== null,
  });
}

export function useOpenDispute() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ confirmationId, comment }: { confirmationId: string; comment: string }) =>
      api.openDispute(confirmationId, comment),
    onSuccess: () => client.invalidateQueries({ queryKey: ['disputes'] }),
  });
}

export function useTasks(orgId: string) {
  return useQuery({ queryKey: adminKeys.tasks(orgId), queryFn: () => api.fetchTasks(orgId) });
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: adminKeys.task(taskId ?? ''),
    queryFn: () => api.fetchTask(taskId ?? ''),
    enabled: taskId !== null,
  });
}

export function useCreateTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: (_d, v) => client.invalidateQueries({ queryKey: adminKeys.tasks(v.orgId) }),
  });
}

export function useSetTaskStatus(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: api.Task['status'] }) =>
      api.setTaskStatus(taskId, status),
    onSuccess: () => client.invalidateQueries({ queryKey: adminKeys.tasks(orgId) }),
  });
}

/** Журнал аудита порциями по 50 — листается назад по id. */
export function useAuditLog(orgId: string) {
  return useInfiniteQuery({
    queryKey: adminKeys.audit(orgId),
    queryFn: ({ pageParam }) => api.fetchAuditLog(orgId, pageParam),
    initialPageParam: null as number | null,
    getNextPageParam: (last) => (last.length === 50 ? (last.at(-1)?.id ?? null) : null),
  });
}

export function useHoursReport(orgId: string, period: { from: Date; to: Date } | null) {
  return useQuery({
    queryKey: adminKeys.report(
      orgId,
      period?.from.toISOString() ?? '',
      period?.to.toISOString() ?? '',
    ),
    queryFn: () =>
      period ? api.fetchHoursReport(orgId, period.from, period.to) : Promise.resolve([]),
    enabled: period !== null,
  });
}

export function useOrgCertificates(orgId: string) {
  return useQuery({
    queryKey: adminKeys.certificates(orgId),
    queryFn: () => api.fetchOrgCertificates(orgId),
  });
}

export function useRevokeCertificate(orgId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.revokeCertificate,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: adminKeys.certificates(orgId) }),
        client.invalidateQueries({ queryKey: ['certificates'] }),
      ]),
  });
}
