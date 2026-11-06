import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Button } from './Button';
import { Screen } from './Screen';

interface ErrorScreenProps {
  error: Error;
  retry: () => Promise<void>;
}

/**
 * Экран вместо упавшего: без технических подробностей (они только в режиме разработки),
 * с понятным действием. Часы и отметки хранятся на сервере и в очереди — их сбой не трогает.
 */
export function ErrorScreen({ error, retry }: ErrorScreenProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        <View style={{ alignItems: 'center' }}>
          <Ionicons
            name="construct-outline"
            size={64}
            color={colors.primary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </View>
        <AppText variant="title" align="center" accessibilityRole="alert">
          {t('common.errorTitle')}
        </AppText>
        <AppText tone="muted" align="center">
          {t('common.errorBody')}
        </AppText>
        {__DEV__ ? (
          <AppText variant="caption" tone="danger" align="center" selectable>
            {error.message}
          </AppText>
        ) : null}
        <Button title={t('common.retry')} onPress={() => void retry()} />
        <Button variant="ghost" title={t('common.goHome')} onPress={() => router.replace('/')} />
      </View>
    </Screen>
  );
}
