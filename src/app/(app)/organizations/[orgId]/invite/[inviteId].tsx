import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { buildInviteLink } from '@/features/organizations/invite-link';
import { useInvite, useMyOrganizations } from '@/features/organizations/queries';

export default function InviteScreen() {
  const { t } = useTranslation();
  const { orgId, inviteId } = useLocalSearchParams<{ orgId: string; inviteId: string }>();
  const invite = useInvite(inviteId);
  const orgName = useMyOrganizations().data?.find((o) => o.id === orgId)?.name ?? '';
  const [shareError, setShareError] = useState(false);

  if (!invite.data) {
    return (
      <Screen edges={['bottom']}>
        <QueryState
          isLoading={invite.isLoading}
          error={invite.error ?? (invite.isSuccess ? new Error('invite_not_found') : null)}
          onRetry={() => void invite.refetch()}
        />
      </Screen>
    );
  }

  const link = buildInviteLink(invite.data.code);

  const share = async () => {
    setShareError(false);
    try {
      await Share.share({ message: t('organizations.shareMessage', { org: orgName, link }) });
    } catch {
      setShareError(true);
    }
  };

  return (
    <Screen scroll edges={['bottom']}>
      <AppText variant="title" align="center">
        {orgName}
      </AppText>
      <AppText align="center" tone="muted">
        {t('organizations.inviteFor', { role: t(`roles.${invite.data.role}`) })}
      </AppText>

      {/* QR всегда чёрный на белом: так его надёжно читают камеры и в тёмной теме. */}
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('organizations.qrLabel', { org: orgName })}
        style={{
          alignSelf: 'center',
          padding: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
        }}
      >
        <QRCode value={link} size={260} color="#000000" backgroundColor="#FFFFFF" ecl="M" />
      </View>

      <AppText align="center" tone="muted">
        {t('organizations.inviteHint')}
      </AppText>
      <AppText align="center" variant="caption" selectable>
        {link}
      </AppText>

      <Button title={t('organizations.share')} onPress={() => void share()} />
      {shareError ? (
        <AppText tone="danger" accessibilityRole="alert">
          {t('errors.generic')}
        </AppText>
      ) : null}
    </Screen>
  );
}
