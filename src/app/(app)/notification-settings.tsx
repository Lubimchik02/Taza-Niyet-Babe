import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { Toggle } from '@/components/ui/Toggle';
import { PushStatusCard } from '@/features/notifications/components/PushStatusCard';
import { useMutedTypes, useSaveMutedTypes } from '@/features/notifications/queries';
import {
  isCategoryMuted,
  PUSH_CATEGORY_KEYS,
  toggleCategory,
  type PushCategory,
} from '@/features/notifications/types';
import { toDbError } from '@/lib/db-errors';

/** Какие пуши присылать. Лента в приложении показывает всё независимо от настроек. */
export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const muted = useMutedTypes();
  const save = useSaveMutedTypes();

  const set = (category: PushCategory, enabled: boolean) => {
    save.mutate(toggleCategory(category, enabled, muted.data ?? []));
  };

  return (
    <Screen scroll edges={['bottom']}>
      <PushStatusCard />
      <AppText tone="muted">{t('notifications.settingsHint')}</AppText>
      <QueryState
        isLoading={muted.isLoading}
        error={muted.error}
        onRetry={() => void muted.refetch()}
      />
      {muted.data ? (
        <Card>
          {PUSH_CATEGORY_KEYS.map((category) => (
            <Toggle
              key={category}
              label={t(`notifications.categories.${category}`)}
              hint={t(`notifications.categories.${category}Hint`)}
              value={!isCategoryMuted(category, muted.data)}
              onChange={(value) => set(category, value)}
            />
          ))}
        </Card>
      ) : null}
      {save.error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {t(`errors.${toDbError(save.error).code}`)}
        </AppText>
      ) : null}
    </Screen>
  );
}
