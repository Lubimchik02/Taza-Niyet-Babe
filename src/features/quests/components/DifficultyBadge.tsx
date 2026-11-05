import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import type { QuestDifficulty } from '@/lib/db';
import { difficultyColors } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

export const DIFFICULTY_ICONS: Record<QuestDifficulty, ComponentProps<typeof Ionicons>['name']> = {
  easy: 'leaf',
  medium: 'trail-sign',
  hard: 'flame',
  extreme: 'skull',
};

/** Сложность квеста: цвет + иконка + подпись (не только цвет — для дальтоников). */
export function DifficultyBadge({ difficulty }: { difficulty: QuestDifficulty }) {
  const { t } = useTranslation();
  const { radius, spacing } = useTheme();
  const { bg, fg } = difficultyColors[difficulty];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
    >
      <Ionicons
        name={DIFFICULTY_ICONS[difficulty]}
        size={16}
        color={fg}
        accessibilityElementsHidden
      />
      <AppText variant="caption" style={{ color: fg, fontWeight: '700' }}>
        {t(`quests.difficulties.${difficulty}`)}
      </AppText>
    </View>
  );
}
