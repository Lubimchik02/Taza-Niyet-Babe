import type { OrgRole, Tables } from '@/lib/db';
import { unwrap } from '@/lib/db-errors';
import { supabase } from '@/lib/supabase';

export type Organization = Pick<Tables<'organizations'>, 'id' | 'name' | 'slug' | 'description'>;

export interface MyOrganization extends Organization {
  membershipId: string;
  role: OrgRole;
}

export type OrgMember = {
  membershipId: string;
  userId: string;
  fullName: string;
  role: OrgRole;
};

export type Invite = Tables<'org_invites'>;

/** Организации текущего пользователя с его ролью в каждой. */
export async function fetchMyOrganizations(userId: string): Promise<MyOrganization[]> {
  const rows = unwrap(
    await supabase
      .from('memberships')
      .select('id, role, organizations (id, name, slug, description)')
      .eq('user_id', userId)
      .order('created_at'),
  );
  return rows.flatMap((row) =>
    row.organizations ? [{ ...row.organizations, membershipId: row.id, role: row.role }] : [],
  );
}

export async function fetchOrganization(orgId: string): Promise<Organization | null> {
  return unwrap(
    await supabase
      .from('organizations')
      .select('id, name, slug, description')
      .eq('id', orgId)
      .maybeSingle(),
  );
}

export async function createOrganization(input: {
  name: string;
  slug: string;
  description: string;
}): Promise<Organization> {
  return unwrap(
    await supabase.rpc('create_organization', {
      p_name: input.name,
      p_slug: input.slug,
      p_description: input.description,
    }),
  );
}

export async function searchOrganizations(query: string) {
  return unwrap(await supabase.rpc('search_organizations', { p_query: query }));
}

export async function fetchOrgMembers(orgId: string): Promise<OrgMember[]> {
  const rows = unwrap(await supabase.rpc('list_org_members', { p_org_id: orgId }));
  return rows.map((r) => ({
    membershipId: r.membership_id,
    userId: r.user_id,
    fullName: r.full_name,
    role: r.role,
  }));
}

export async function setMemberRole(membershipId: string, role: OrgRole): Promise<void> {
  unwrap(await supabase.rpc('set_member_role', { p_membership_id: membershipId, p_role: role }));
}

export async function removeMember(membershipId: string): Promise<void> {
  unwrap(await supabase.from('memberships').delete().eq('id', membershipId));
}

/** Активные приглашения: не отозваны, не просрочены, не исчерпаны. */
export async function fetchActiveInvites(orgId: string): Promise<Invite[]> {
  const rows = unwrap(
    await supabase
      .from('org_invites')
      .select('*')
      .eq('org_id', orgId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false }),
  );
  const now = Date.now();
  return rows.filter(
    (i) =>
      (i.expires_at === null || new Date(i.expires_at).getTime() > now) &&
      (i.max_uses === null || i.uses < i.max_uses),
  );
}

export async function fetchInvite(inviteId: string): Promise<Invite | null> {
  return unwrap(await supabase.from('org_invites').select('*').eq('id', inviteId).maybeSingle());
}

export async function createInvite(
  orgId: string,
  role: Extract<OrgRole, 'volunteer' | 'coordinator'>,
): Promise<Invite> {
  return unwrap(
    await supabase.rpc('create_invite', {
      p_org_id: orgId,
      p_role: role,
      // Волонтёрская ссылка живёт неделю; координаторская — сутки и одно использование.
      p_expires_in_hours: role === 'coordinator' ? 24 : 24 * 7,
      ...(role === 'coordinator' ? { p_max_uses: 1 } : {}),
    }),
  );
}

export async function revokeInvite(inviteId: string): Promise<void> {
  unwrap(await supabase.rpc('revoke_invite', { p_invite_id: inviteId }));
}

export async function fetchInvitePreview(code: string) {
  const rows = unwrap(await supabase.rpc('get_invite_preview', { p_code: code }));
  return rows[0] ?? null;
}

export async function acceptInvite(code: string): Promise<{ orgId: string; role: OrgRole }> {
  const membership = unwrap(await supabase.rpc('accept_invite', { p_code: code }));
  return { orgId: membership.org_id, role: membership.role };
}

export async function requestToJoin(orgId: string, message: string): Promise<void> {
  unwrap(await supabase.rpc('request_to_join', { p_org_id: orgId, p_message: message }));
}

export async function fetchMyPendingRequests(userId: string): Promise<string[]> {
  const rows = unwrap(
    await supabase
      .from('join_requests')
      .select('org_id')
      .eq('user_id', userId)
      .eq('status', 'pending'),
  );
  return rows.map((r) => r.org_id);
}

export async function fetchJoinRequests(orgId: string) {
  return unwrap(await supabase.rpc('list_join_requests', { p_org_id: orgId }));
}

export async function decideJoinRequest(requestId: string, approve: boolean): Promise<void> {
  unwrap(
    await supabase.rpc('decide_join_request', { p_request_id: requestId, p_approve: approve }),
  );
}
