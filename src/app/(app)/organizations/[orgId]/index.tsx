import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { useSession } from '@/features/auth/session-store';
import { MemberRow } from '@/features/organizations/components/MemberRow';
import { RoleBadge } from '@/features/organizations/components/RoleBadge';
import {
  useActiveInvites,
  useCreateInvite,
  useDecideJoinRequest,
  useJoinRequests,
  useMyOrganizations,
  useOrgMembers,
  useRemoveMember,
  useRevokeInvite,
} from '@/features/organizations/queries';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

export default function OrganizationScreen() {
  const { t, i18n } = useTranslation();
  const { spacing } = useTheme();
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const userId = useSession((s) => s.session?.user.id);

  const myOrgs = useMyOrganizations();
  const org = myOrgs.data?.find((o) => o.id === orgId);
  const isAdmin = org?.role === 'admin';
  const isManager = isAdmin || org?.role === 'coordinator';

  const members = useOrgMembers(orgId);
  const invites = useActiveInvites(orgId, isManager);
  const requests = useJoinRequests(orgId, isManager);
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const decide = useDecideJoinRequest();
  const leave = useRemoveMember();
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  const invite = (role: 'volunteer' | 'coordinator') =>
    run(async () => {
      const created = await createInvite.mutateAsync({ orgId, role });
      router.push({
        pathname: '/organizations/[orgId]/invite/[inviteId]',
        params: { orgId, inviteId: created.id },
      });
    });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });

  if (!org) {
    return (
      <Screen edges={['bottom']}>
        <QueryState
          isLoading={myOrgs.isLoading}
          error={myOrgs.error ?? (myOrgs.isSuccess ? new Error('org_not_found') : null)}
          onRetry={() => void myOrgs.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen options={{ title: org.name }} />

      <View style={{ gap: spacing.sm }}>
        <AppText variant="title">{org.name}</AppText>
        <RoleBadge role={org.role} />
        {org.description ? <AppText tone="muted">{org.description}</AppText> : null}
      </View>

      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}

      {isManager ? (
        <Card>
          <AppText variant="heading">{t('organizations.requests')}</AppText>
          <QueryState
            isLoading={requests.isLoading}
            error={requests.error}
            onRetry={() => void requests.refetch()}
          />
          {requests.data?.length === 0 ? (
            <AppText tone="muted">{t('organizations.noRequests')}</AppText>
          ) : null}
          {requests.data?.map((r) => (
            <View key={r.id} style={{ gap: spacing.sm }}>
              <AppText variant="bodyStrong">{r.full_name || '—'}</AppText>
              {r.message ? <AppText tone="muted">«{r.message}»</AppText> : null}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t('organizations.approve')}
                    onPress={() =>
                      void run(() => decide.mutateAsync({ requestId: r.id, approve: true }))
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    variant="secondary"
                    title={t('organizations.reject')}
                    onPress={() =>
                      void run(() => decide.mutateAsync({ requestId: r.id, approve: false }))
                    }
                  />
                </View>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      {isManager ? (
        <Card>
          <AppText variant="heading">{t('organizations.invites')}</AppText>
          <Button
            title={t('organizations.inviteVolunteers')}
            loading={createInvite.isPending && createInvite.variables?.role === 'volunteer'}
            onPress={() => void invite('volunteer')}
          />
          {isAdmin ? (
            <Button
              variant="secondary"
              title={t('organizations.inviteCoordinator')}
              loading={createInvite.isPending && createInvite.variables?.role === 'coordinator'}
              onPress={() => void invite('coordinator')}
            />
          ) : null}
          <QueryState
            isLoading={invites.isLoading}
            error={invites.error}
            onRetry={() => void invites.refetch()}
          />
          {invites.data?.length === 0 ? (
            <AppText tone="muted">{t('organizations.noInvites')}</AppText>
          ) : null}
          {invites.data?.map((inv) => {
            const canRevoke = inv.role === 'volunteer' || isAdmin;
            return (
              <View key={inv.id} style={{ gap: spacing.xs }}>
                <AppText variant="bodyStrong">
                  {t('organizations.inviteFor', { role: t(`roles.${inv.role}`) })}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {inv.max_uses === null
                    ? t('organizations.inviteUses', { uses: inv.uses })
                    : t('organizations.inviteUsesOf', { uses: inv.uses, max: inv.max_uses })}
                  {' · '}
                  {inv.expires_at
                    ? t('organizations.inviteExpires', { date: formatDate(inv.expires_at) })
                    : t('organizations.inviteNoExpiry')}
                </AppText>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="secondary"
                      title={t('organizations.showQr')}
                      onPress={() =>
                        router.push({
                          pathname: '/organizations/[orgId]/invite/[inviteId]',
                          params: { orgId, inviteId: inv.id },
                        })
                      }
                    />
                  </View>
                  {canRevoke ? (
                    <View style={{ flex: 1 }}>
                      <ConfirmButton
                        variant="ghost"
                        title={t('organizations.revoke')}
                        confirmTitle={t('organizations.confirmRemove')}
                        onConfirm={() => void run(() => revokeInvite.mutateAsync(inv.id))}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">
          {t('organizations.members')}
          {members.data ? ` · ${members.data.length}` : ''}
        </AppText>
        <QueryState
          isLoading={members.isLoading}
          error={members.error}
          onRetry={() => void members.refetch()}
        />
        {members.data?.map((m) => (
          <MemberRow
            key={m.membershipId}
            member={m}
            isSelf={m.userId === userId}
            canManage={isAdmin}
          />
        ))}
      </Card>

      <ConfirmButton
        variant="danger"
        title={t('organizations.leave')}
        confirmTitle={t('organizations.confirmLeave')}
        loading={leave.isPending}
        onConfirm={() =>
          void run(async () => {
            await leave.mutateAsync(org.membershipId);
            router.replace('/organizations');
          })
        }
      />
    </Screen>
  );
}
