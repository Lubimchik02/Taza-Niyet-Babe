import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import {
  useMyPendingRequests,
  useOrgSearch,
  useRequestToJoin,
} from '@/features/organizations/queries';
import { joinRequestSchema } from '@/features/organizations/schemas';
import { NameForm } from '@/features/profile/components/NameForm';
import { useMyProfile } from '@/features/profile/queries';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

export default function SearchOrganizationsScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const [query, setQuery] = useState('');
  const results = useOrgSearch(query);
  const pending = useMyPendingRequests();
  const requestToJoin = useRequestToJoin();
  const profile = useMyProfile();
  const needsName = profile.isSuccess && !profile.data?.full_name.trim();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const send = async (orgId: string) => {
    setError(null);
    const parsed = joinRequestSchema.safeParse({ message });
    if (!parsed.success) {
      setError(t('organizations.formErrors.messageLength'));
      return;
    }
    try {
      await requestToJoin.mutateAsync({ orgId, message: parsed.data.message });
      setOpenFor(null);
      setMessage('');
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  return (
    <Screen scroll edges={['bottom']}>
      <TextField
        label={t('organizations.search.label')}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        returnKeyType="search"
      />
      {query.trim().length < 2 ? (
        <AppText tone="muted">{t('organizations.search.hint')}</AppText>
      ) : (
        <QueryState
          isLoading={results.isLoading}
          error={results.error}
          onRetry={() => void results.refetch()}
        />
      )}
      {results.data?.length === 0 ? (
        <AppText tone="muted">{t('organizations.search.empty')}</AppText>
      ) : null}

      {results.data?.map((org) => {
        const requested = pending.data?.includes(org.id) ?? false;
        return (
          <Card key={org.id}>
            <AppText variant="heading">{org.name}</AppText>
            {org.description ? (
              <AppText tone="muted" numberOfLines={3}>
                {org.description}
              </AppText>
            ) : null}
            <AppText variant="caption" tone="muted">
              {t('organizations.membersCount', { count: org.members_count })}
            </AppText>
            {org.is_member ? (
              <AppText tone="primary">{t('organizations.search.member')}</AppText>
            ) : requested ? (
              <AppText tone="primary">{t('organizations.search.requested')}</AppText>
            ) : openFor === org.id && needsName ? (
              <NameForm initialName="" prompt={t('profile.namePrompt')} />
            ) : openFor === org.id ? (
              <View style={{ gap: spacing.md }}>
                <TextField
                  label={t('organizations.search.message')}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={500}
                />
                {error ? (
                  <AppText tone="danger" accessibilityRole="alert">
                    {error}
                  </AppText>
                ) : null}
                <Button
                  title={t('organizations.search.send')}
                  loading={requestToJoin.isPending}
                  onPress={() => void send(org.id)}
                />
                <Button
                  variant="ghost"
                  title={t('common.cancel')}
                  onPress={() => setOpenFor(null)}
                />
              </View>
            ) : (
              <Button
                variant="secondary"
                title={t('organizations.search.request')}
                onPress={() => {
                  setError(null);
                  setOpenFor(org.id);
                }}
              />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
