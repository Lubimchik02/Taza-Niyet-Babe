import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { Language } from '@/i18n/languages';
import { useTheme } from '@/theme/ThemeProvider';

import type { BenefitAchievement } from '../api';

type IconName = ComponentProps<typeof Ionicons>['name'];
const ICONS: Record<string, IconName> = {
  flag: 'flag',
  time: 'time',
  hourglass: 'hourglass',
  flame: 'flame',
  trophy: 'trophy',
  ribbon: 'ribbon',
};

/** Бейджи: открытые — цветом награды, закрытые — приглушённо, с описанием условия. */
export function Achievements({ items }: { items: BenefitAchievement[] }) {
  const { t, i18n } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const lang = (['kk', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'ru') as Language;

  return (
    <Card>
      <AppText variant="heading">{t('benefit.achievements')}</AppText>
      {items.map((a) => {
        const unlocked = a.unlocked_at !== null;
        return (
          <View
            key={a.code}
            accessible
            aria-label={`${a.name[lang]}. ${a.description[lang]}. ${
              unlocked
                ? t('benefit.unlockedAt', {
                    date: new Date(a.unlocked_at ?? '').toLocaleDateString(i18n.language),
                  })
                : t('benefit.locked')
            }`}
            style={{
              flexDirection: 'row',
              gap: spacing.md,
              alignItems: 'center',
              opacity: unlocked ? 1 : 0.55,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: unlocked ? colors.reward : colors.surfaceMuted,
              }}
            >
              <Ionicons
                name={unlocked ? (ICONS[a.icon] ?? 'ribbon') : 'lock-closed'}
                size={26}
                color={unlocked ? colors.onReward : colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{a.name[lang]}</AppText>
              <AppText variant="caption" tone="muted">
                {unlocked
                  ? t('benefit.unlockedAt', {
                      date: new Date(a.unlocked_at ?? '').toLocaleDateString(i18n.language),
                    })
                  : a.description[lang]}
              </AppText>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
