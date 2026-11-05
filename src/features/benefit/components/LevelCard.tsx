import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';

import { levelProgress } from '../levels';

/** Уровень и прогресс-бар до следующего. */
export function LevelCard({ points }: { points: number }) {
  const { t } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const level = levelProgress(points);

  return (
    <Card>
      <AppText tone="muted">{t('benefit.level')}</AppText>
      <AppText variant="title">{t(`benefit.levels.${level.current}`)}</AppText>
      <View
        role="progressbar"
        aria-label={t('benefit.levelProgress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level.progress * 100)}
        style={{ height: 14, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted }}
      >
        <View
          style={{
            width: `${Math.round(level.progress * 100)}%`,
            height: 14,
            borderRadius: radius.pill,
            backgroundColor: colors.reward,
          }}
        />
      </View>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="bodyStrong">
          {t('benefit.points')}: {points}
        </AppText>
        <AppText tone="muted">
          {level.next
            ? t('benefit.toNext', {
                level: t(`benefit.levels.${level.next}`),
                points: level.pointsToNext,
              })
            : t('benefit.maxLevel')}
        </AppText>
      </View>
    </Card>
  );
}
