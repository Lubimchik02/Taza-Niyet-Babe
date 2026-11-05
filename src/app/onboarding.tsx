import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useSettings } from '@/features/settings/settings-store';
import { useTheme } from '@/theme/ThemeProvider';

const SLIDES = [
  { key: 'hours', icon: 'time-outline' },
  { key: 'growth', icon: 'trending-up-outline' },
  { key: 'portfolio', icon: 'ribbon-outline' },
] as const satisfies readonly { key: string; icon: ComponentProps<typeof Ionicons>['name'] }[];

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const completeOnboarding = useSettings((s) => s.completeOnboarding);
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index] ?? SLIDES[0];
  const isLast = index === SLIDES.length - 1;

  return (
    <Screen>
      <View style={{ alignItems: 'flex-end' }}>
        {!isLast ? (
          <Button variant="ghost" title={t('onboarding.skip')} onPress={completeOnboarding} />
        ) : null}
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
        <View
          style={{
            width: 160,
            height: 160,
            borderRadius: radius.pill,
            backgroundColor: colors.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={slide.icon}
            size={80}
            color={colors.primary}
            accessibilityElementsHidden
          />
        </View>
        <AppText variant="title" align="center">
          {t(`onboarding.slides.${slide.key}.title`)}
        </AppText>
        <AppText tone="muted" align="center">
          {t(`onboarding.slides.${slide.key}.body`)}
        </AppText>
      </View>

      <View
        style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}
        accessible
        accessibilityLabel={t('onboarding.progress', { current: index + 1, total: SLIDES.length })}
      >
        {SLIDES.map((s, i) => (
          <View
            key={s.key}
            style={{
              width: i === index ? 24 : 10,
              height: 10,
              borderRadius: radius.pill,
              backgroundColor: i === index ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>

      <Button
        title={isLast ? t('onboarding.start') : t('onboarding.next')}
        onPress={() => (isLast ? completeOnboarding() : setIndex((i) => i + 1))}
      />
    </Screen>
  );
}
