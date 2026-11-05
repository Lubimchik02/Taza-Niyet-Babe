import { unwrap } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

import type { CertificateData, CertificateQuest, CertificateSkill } from './template';

export interface MyCertificate {
  id: string;
  orgName: string;
  totalMinutes: number;
  issuedAt: string;
  revokedAt: string | null;
}

export async function fetchMyCertificates(userId: string): Promise<MyCertificate[]> {
  const rows = unwrap(
    await supabase
      .from('certificates')
      .select('id, total_minutes, issued_at, revoked_at, organizations (name)')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false }),
  );
  return rows.map((r) => ({
    id: r.id,
    orgName: r.organizations?.name ?? '—',
    totalMinutes: r.total_minutes,
    issuedAt: r.issued_at,
    revokedAt: r.revoked_at,
  }));
}

/** Организации, где у пользователя есть подтверждённые часы, — для них можно выпустить сертификат. */
export async function fetchCertifiableOrgs(userId: string) {
  const rows = unwrap(
    await supabase
      .from('hour_confirmations')
      .select('org_id, organizations (name)')
      .eq('user_id', userId)
      .gt('confirmed_minutes', 0),
  );
  const unique = new Map<string, string>();
  for (const r of rows) unique.set(r.org_id, r.organizations?.name ?? '—');
  return [...unique].map(([id, name]) => ({ id, name }));
}

export async function issueCertificate(orgId: string) {
  return unwrap(await supabase.rpc('issue_certificate', { p_org_id: orgId }));
}

/**
 * Данные сертификата — через ту же публичную функцию, что и страница проверки:
 * владелец видит ровно то, что увидит вуз или работодатель.
 */
export async function fetchCertificate(id: string): Promise<CertificateData | null> {
  const rows = unwrap(await supabase.rpc('verify_certificate', { p_id: id }));
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    full_name: row.full_name,
    org_name: row.org_name,
    total_minutes: row.total_minutes,
    quests_count: row.quests_count,
    avg_rating: row.avg_rating === null ? null : Number(row.avg_rating),
    skills: row.skills as unknown as CertificateSkill[],
    quests: (row.quests ?? []) as unknown as CertificateQuest[],
    issued_at: row.issued_at,
    revoked_at: row.revoked_at,
  };
}
