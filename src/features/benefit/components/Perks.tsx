import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/theme/ThemeProvider';

import { isPerkUnlocked, LEVELS, type LevelCode } from '../levels';

/** «Что ты получишь»: понятные преимущества каждого уровня — открытые и впереди. */
export function Perks({ current }: { current: LevelCode }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  return (
    <Card>
      <AppText variant="heading">{t('benefit.perksTitle')}</AppText>
      {LEVELS.map(({ code }) => {
        const unlocked = isPerkUnlocked(current, code);
        return (
          <View
            key={code}
            accessible
            aria-label={`${t(`benefit.perks.${code}`)}. ${
              unlocked
                ? t('benefit.perkUnlocked')
                : t('benefit.perkLocked', { level: t(`benefit.levels.${code}`) })
            }`}
            style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}
          >
            <Ionicons
              name={unlocked ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={unlocked ? colors.primary : colors.textMuted}
            />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" tone={unlocked ? 'default' : 'muted'}>
                {t(`benefit.perks.${code}`)}
              </AppText>
              <AppText variant="caption" tone="muted">
                {unlocked
                  ? t('benefit.perkUnlocked')
                  : t('benefit.perkLocked', { level: t(`benefit.levels.${code}`) })}
              </AppText>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
