import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { RoleBadge } from '@/features/organizations/components/RoleBadge';
import { parseInviteCode } from '@/features/organizations/invite-link';
import { useMyOrganizations } from '@/features/organizations/queries';

export default function OrganizationsScreen() {
  const { t } = useTranslation();
  const orgs = useMyOrganizations();
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();

  const openCode = () => {
    const parsed = parseInviteCode(code);
    if (!parsed) {
      setCodeError(t('organizations.invite.invalidCode'));
      return;
    }
    setCodeError(undefined);
    setCode('');
    router.push({ pathname: '/join/[code]', params: { code: parsed } });
  };

  return (
    <Screen scroll edges={['bottom']}>
      <QueryState
        isLoading={orgs.isLoading}
        error={orgs.error}
        onRetry={() => void orgs.refetch()}
      />

      {orgs.data?.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={t('organizations.empty')}
          body={t('organizations.emptyHint')}
        />
      ) : null}

      {orgs.data?.map((org) => (
        <Pressable
          key={org.id}
          accessibilityRole="button"
          accessibilityLabel={`${org.name}, ${t(`roles.${org.role}`)}`}
          onPress={() =>
            router.push({ pathname: '/organizations/[orgId]', params: { orgId: org.id } })
          }
        >
          <Card>
            <AppText variant="heading">{org.name}</AppText>
            {org.description ? (
              <AppText tone="muted" numberOfLines={2}>
                {org.description}
              </AppText>
            ) : null}
            <RoleBadge role={org.role} />
          </Card>
        </Pressable>
      ))}

      <Card>
        <TextField
          label={t('organizations.invite.codeLabel')}
          autoCapitalize="none"
          autoCorrect={false}
          value={code}
          onChangeText={setCode}
          onSubmitEditing={openCode}
          error={codeError}
        />
        <Button variant="secondary" title={t('organizations.invite.openCode')} onPress={openCode} />
        <Button title={t('organizations.invite.scan')} onPress={() => router.push('/scan')} />
      </Card>

      <Button
        variant="secondary"
        title={t('organizations.find')}
        onPress={() => router.push('/organizations/search')}
      />
      <Button
        variant="ghost"
        title={t('organizations.create')}
        onPress={() => router.push('/organizations/new')}
      />
    </Screen>
  );
}
