import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { useSession } from '@/features/auth/session-store';
import { INVITE_CODE_PATTERN } from '@/features/organizations/invite-link';
import { usePendingInvite } from '@/features/organizations/pending-invite-store';
import { useAcceptInvite, useInvitePreview } from '@/features/organizations/queries';
import { NameForm } from '@/features/profile/components/NameForm';
import { useMyProfile } from '@/features/profile/queries';
import { useSettings } from '@/features/settings/settings-store';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Открывается по ссылке tazaniyet://join/<код> и после сканирования QR.
 * Маршрут доступен без входа: код запоминается, и после входа приглашение откроется снова.
 */
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const signedIn = useSession((s) => s.session !== null);
  const onboardingDone = useSettings((s) => s.onboardingDone);
  const setPending = usePendingInvite((s) => s.setCode);
  const valid = typeof code === 'string' && INVITE_CODE_PATTERN.test(code);

  useEffect(() => {
    if (!signedIn && valid) setPending(code);
  }, [signedIn, valid, code, setPending]);

  if (!signedIn) return <Redirect href={onboardingDone ? '/sign-in' : '/onboarding'} />;
  return <JoinPreview code={valid ? code : null} />;
}

function JoinPreview({ code }: { code: string | null }) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const preview = useInvitePreview(code ?? '');
  const accept = useAcceptInvite();
  const profile = useMyProfile();
  const needsName = profile.isSuccess && !profile.data?.full_name.trim();
  const [error, setError] = useState<string | null>(null);

  const goHome = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const openOrg = (orgId: string) =>
    router.replace({ pathname: '/organizations/[orgId]', params: { orgId } });

  const data = code ? preview.data : null;
  const problem = code ? data?.problem : 'invite_not_found';
  const orgId = data?.org_id ?? null;

  const join = async () => {
    if (!code) return;
    setError(null);
    try {
      const result = await accept.mutateAsync(code);
      openOrg(result.orgId);
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  return (
    <Screen scroll>
      <AppText variant="title">{t('organizations.invite.title')}</AppText>

      {code ? (
        <QueryState
          isLoading={preview.isLoading}
          error={preview.error}
          onRetry={() => void preview.refetch()}
        />
      ) : null}

      {data && data.org_id && data.org_name && data.role ? (
        <Card>
          <AppText variant="heading">{data.org_name}</AppText>
          {data.org_description ? <AppText tone="muted">{data.org_description}</AppText> : null}
          <AppText variant="bodyStrong">
            {t('organizations.invite.role', { role: t(`roles.${data.role}`) })}
          </AppText>
        </Card>
      ) : null}

      {problem ? (
        <AppText tone="danger" accessibilityRole="alert">
          {t(`errors.${toDbError({ message: problem }).code}`)}
        </AppText>
      ) : null}
      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}

      <View style={{ gap: spacing.md }}>
        {/* Участнику предлагаем вступить, только если приглашение повышает его до координатора. */}
        {orgId && data?.is_member && data.role !== 'coordinator' ? (
          <>
            <AppText tone="primary">{t('organizations.invite.alreadyMember')}</AppText>
            <Button title={t('organizations.invite.open')} onPress={() => openOrg(orgId)} />
          </>
        ) : orgId && !problem ? (
          needsName ? (
            // Без имени координатор не поймёт, кто вступил.
            <NameForm initialName="" prompt={t('profile.namePrompt')} />
          ) : (
            <Button
              title={t('organizations.invite.accept')}
              loading={accept.isPending}
              onPress={() => void join()}
            />
          )
        ) : null}
        <Button variant="ghost" title={t('common.close')} onPress={goHome} />
      </View>
    </Screen>
  );
}
