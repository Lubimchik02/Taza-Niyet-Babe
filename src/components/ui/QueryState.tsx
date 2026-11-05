import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Button } from './Button';

interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** Индикатор загрузки или понятная ошибка с кнопкой «Повторить». null — данные готовы. */
export function QueryState({ isLoading, error, onRetry }: QueryStateProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  if (isLoading) {
    return (
      <View style={{ padding: spacing.xl, alignItems: 'center' }}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          accessibilityLabel={t('common.loading')}
        />
      </View>
    );
  }
  if (error) {
    return (
      <View style={{ gap: spacing.md }}>
        <AppText tone="danger" accessibilityRole="alert">
          {t(`errors.${toDbError(error).code}`)}
        </AppText>
        <Button variant="secondary" title={t('common.retry')} onPress={onRetry} />
      </View>
    );
  }
  return null;
}
