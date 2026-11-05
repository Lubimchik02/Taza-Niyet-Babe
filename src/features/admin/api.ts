import type { Tables } from '@/lib/db';
import { unwrap } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

import type { ReportRow } from './report';

export type DisputeItem = Awaited<ReturnType<typeof fetchDisputes>>[number];
export type AuditItem = Awaited<ReturnType<typeof fetchAuditLog>>[number];
export type Task = Pick<
  Tables<'tasks'>,
  'id' | 'title' | 'description' | 'address' | 'lat' | 'lng' | 'status' | 'created_at'
>;

// ------------------------------- Споры -------------------------------
export async function fetchDisputes(orgId: string) {
  return unwrap(await supabase.rpc('list_disputes', { p_org_id: orgId }));
}

export async function resolveDispute(input: {
  disputeId: string;
  status: 'resolved' | 'rejected';
  resolution: string;
  minutes: number | null;
}) {
  return unwrap(
    await supabase.rpc('resolve_dispute', {
      p_dispute_id: input.disputeId,
      p_status: input.status,
      p_resolution: input.resolution,
      ...(input.minutes === null ? {} : { p_minutes: input.minutes }),
    }),
  );
}

/** Спор волонтёра по конкретному подтверждению (последний). */
export async function fetchMyDispute(confirmationId: string) {
  return unwrap(
    await supabase
      .from('disputes')
      .select('id, status, comment, resolution, resolved_at')
      .eq('confirmation_id', confirmationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

export async function openDispute(confirmationId: string, comment: string) {
  return unwrap(
    await supabase.rpc('open_dispute', { p_confirmation_id: confirmationId, p_comment: comment }),
  );
}

// ------------------------------- Задачи «сверху» -------------------------------
export async function fetchTasks(orgId: string): Promise<(Task & { questsCount: number })[]> {
  const rows = unwrap(
    await supabase
      .from('tasks')
      .select('id, title, description, address, lat, lng, status, created_at, quests (count)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
  );
  return rows.map(({ quests, ...t }) => ({ ...t, questsCount: quests[0]?.count ?? 0 }));
}

export async function fetchTask(taskId: string): Promise<Task | null> {
  return unwrap(
    await supabase
      .from('tasks')
      .select('id, title, description, address, lat, lng, status, created_at')
      .eq('id', taskId)
      .maybeSingle(),
  );
}

export async function createTask(input: {
  orgId: string;
  title: string;
  description: string;
  address: string;
}) {
  return unwrap(
    await supabase
      .from('tasks')
      .insert({
        org_id: input.orgId,
        title: input.title.trim(),
        description: input.description.trim(),
        address: input.address.trim() || null,
      })
      .select('id')
      .single(),
  );
}

export async function setTaskStatus(taskId: string, status: Task['status']) {
  unwrap(await supabase.from('tasks').update({ status }).eq('id', taskId));
}

/** Привязка квеста к задаче (БД проверяет, что задача из той же организации). */
export async function linkQuestToTask(questId: string, taskId: string) {
  unwrap(await supabase.from('quests').update({ task_id: taskId }).eq('id', questId));
}

// ------------------------------- Аудит, отчёты, сертификаты -------------------------------
export async function fetchAuditLog(orgId: string, before: number | null) {
  return unwrap(
    await supabase.rpc('list_audit_log', {
      p_org_id: orgId,
      p_limit: 50,
      ...(before === null ? {} : { p_before: before }),
    }),
  );
}

export async function fetchHoursReport(orgId: string, from: Date, to: Date): Promise<ReportRow[]> {
  return unwrap(
    await supabase.rpc('hours_report', {
      p_org_id: orgId,
      p_from: from.toISOString(),
      p_to: to.toISOString(),
    }),
  );
}

export async function fetchOrgCertificates(orgId: string) {
  return unwrap(await supabase.rpc('list_org_certificates', { p_org_id: orgId }));
}

export async function revokeCertificate(id: string) {
  return unwrap(await supabase.rpc('revoke_certificate', { p_id: id }));
}
