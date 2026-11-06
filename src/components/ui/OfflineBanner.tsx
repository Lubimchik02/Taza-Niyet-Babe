import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetworkState } from 'expo-network';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { FadeIn } from './FadeIn';

/**
 * Плашка «Нет сети» поверх экрана. Не перехватывает касания: координатор продолжает
 * отмечать людей офлайн, отметки уйдут из очереди, когда появится связь.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const network = useNetworkState();

  if (network.isConnected !== false) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + spacing.sm,
        left: spacing.lg,
        right: spacing.lg,
        zIndex: 10,
      }}
    >
      <FadeIn>
        <View
          accessible
          role="alert"
          aria-live="polite"
          aria-label={t('common.offline')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.text,
          }}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={20}
            color={colors.background}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <AppText variant="caption" style={{ flex: 1, color: colors.background }}>
            {t('common.offline')}
          </AppText>
        </View>
      </FadeIn>
    </View>
  );
}
