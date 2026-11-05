import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { Screen } from '@/components/ui/Screen';
import { mapAuthError, signOut } from '@/features/auth/api';
import { useSession } from '@/features/auth/session-store';
import { useSettings, type ThemePreference } from '@/features/settings/settings-store';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type Language } from '@/i18n/languages';

type LanguageChoice = Language | 'system';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const user = useSession((s) => s.session?.user);
  const { language, theme, setLanguage, setTheme } = useSettings();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const languageOptions = [
    { value: 'system' as const, label: t('profile.languageSystem') },
    ...SUPPORTED_LANGUAGES.map((code) => ({ value: code, label: LANGUAGE_NAMES[code] })),
  ];
  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('profile.themeSystem') },
    { value: 'light', label: t('profile.themeLight') },
    { value: 'dark', label: t('profile.themeDark') },
  ];

  const onSignOut = async () => {
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (e) {
      setError(t(`auth.errors.${mapAuthError(e).code}`));
      setSigningOut(false);
    }
  };

  return (
    <Screen scroll edges={['top']}>
      <AppText variant="title">{t('profile.title')}</AppText>
      <View style={{ gap: 4 }}>
        <AppText tone="muted">{t('profile.signedInAs')}</AppText>
        <AppText variant="bodyStrong">{user?.email ?? user?.phone ?? '—'}</AppText>
      </View>

      <ChoiceGroup<LanguageChoice>
        label={t('profile.language')}
        value={language ?? 'system'}
        options={languageOptions}
        onChange={(v) => setLanguage(v === 'system' ? null : v)}
      />
      <ChoiceGroup<ThemePreference>
        label={t('profile.theme')}
        value={theme}
        options={themeOptions}
        onChange={setTheme}
      />

      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      <Button
        variant="danger"
        title={t('profile.signOut')}
        loading={signingOut}
        onPress={() => void onSignOut()}
      />
    </Screen>
  );
}
