import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { useTheme } from '@/theme/ThemeProvider';

interface PlacesBarProps {
  taken: number;
  capacity: number;
  waitlisted: number;
}

/** «7 / 15» с полосой заполнения и очередью, если мест нет. */
export function PlacesBar({ taken, capacity, waitlisted }: PlacesBarProps) {
  const { t } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const full = taken >= capacity;
  const ratio = capacity > 0 ? Math.min(1, taken / capacity) : 0;

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <AppText variant="bodyStrong">{t('quests.places', { taken, capacity })}</AppText>
        {full ? (
          <AppText variant="bodyStrong" tone="danger">
            {t('quests.full')}
            {waitlisted > 0 ? ` · ${t('quests.waitlistCount', { count: waitlisted })}` : ''}
          </AppText>
        ) : null}
      </View>
      <View
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={taken}
        aria-label={t('quests.places', { taken, capacity })}
        style={{ height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted }}
      >
        <View
          style={{
            width: `${ratio * 100}%`,
            height: 8,
            borderRadius: radius.pill,
            backgroundColor: full ? colors.danger : colors.primary,
          }}
        />
      </View>
    </View>
  );
}
