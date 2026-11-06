import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

import { AppText } from './AppText';
import { Button } from './Button';
import { SkeletonList } from './Skeleton';

interface QueryStateProps {
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Сколько карточек-заглушек показать при загрузке. */
  skeletonRows?: number;
}

/** Скелетон при загрузке или понятная ошибка с кнопкой «Повторить». null — данные готовы. */
export function QueryState({ isLoading, error, onRetry, skeletonRows = 3 }: QueryStateProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  if (isLoading) return <SkeletonList rows={skeletonRows} />;
  if (error) {
    const code = toDbError(error).code;
    return (
      <View style={{ gap: spacing.md, alignItems: 'center', paddingVertical: spacing.lg }}>
        <Ionicons
          name={code === 'network' ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={40}
          color={colors.danger}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <AppText tone="danger" align="center" accessibilityRole="alert">
          {t(`errors.${code}`)}
        </AppText>
        <View style={{ alignSelf: 'stretch' }}>
          <Button variant="secondary" title={t('common.retry')} onPress={onRetry} />
        </View>
      </View>
    );
  }
  return null;
}
