import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import type { QuestDifficulty } from '@/lib/db';
import { useTheme } from '@/theme/ThemeProvider';

import type { FeedFilters, MaxDistanceKm, Period } from '../filters';
import { DIFFICULTIES } from '../schemas';

interface FeedFiltersPanelProps {
  value: FeedFilters;
  onChange: (value: FeedFilters) => void;
  hasLocation: boolean;
  onRequestLocation: () => void;
}

type DifficultyChoice = QuestDifficulty | 'all';
type DistanceChoice = 'any' | '1' | '5' | '20';

export function FeedFiltersPanel({
  value,
  onChange,
  hasLocation,
  onRequestLocation,
}: FeedFiltersPanelProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <ChoiceGroup<DifficultyChoice>
        label={t('quests.difficulty')}
        value={value.difficulties[0] ?? 'all'}
        options={[
          { value: 'all', label: t('quests.difficultyAll') },
          ...DIFFICULTIES.map((d) => ({ value: d, label: t(`quests.difficulties.${d}`) })),
        ]}
        onChange={(d) => onChange({ ...value, difficulties: d === 'all' ? [] : [d] })}
      />
      <ChoiceGroup<Period>
        label={t('quests.period')}
        value={value.period}
        options={(['all', 'today', 'week', 'month'] as const).map((p) => ({
          value: p,
          label: t(`quests.periods.${p}`),
        }))}
        onChange={(period) => onChange({ ...value, period })}
      />
      {hasLocation ? (
        <ChoiceGroup<DistanceChoice>
          label={t('quests.distance')}
          value={
            value.maxDistanceKm === null ? 'any' : (String(value.maxDistanceKm) as DistanceChoice)
          }
          options={[
            { value: 'any', label: t('quests.distanceAny') },
            ...(['1', '5', '20'] as const).map((km) => ({
              value: km,
              label: t('quests.distanceUpTo', { km }),
            })),
          ]}
          onChange={(d) =>
            onChange({ ...value, maxDistanceKm: d === 'any' ? null : (Number(d) as MaxDistanceKm) })
          }
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="heading">{t('quests.distance')}</AppText>
          <AppText tone="muted">{t('quests.distanceNeedsLocation')}</AppText>
          <Button
            variant="secondary"
            title={t('quests.allowLocation')}
            onPress={onRequestLocation}
          />
        </View>
      )}
    </View>
  );
}
