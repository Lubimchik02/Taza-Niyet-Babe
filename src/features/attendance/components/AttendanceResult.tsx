import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { PopIn } from '@/components/ui/PopIn';
import { useTheme } from '@/theme/ThemeProvider';

import type { QrAttendanceState } from '../use-qr-attendance';

/** Итог отметки крупно — его должно быть видно с вытянутой руки на улице. */
export function AttendanceResult({ state }: { state: QrAttendanceState }) {
  const { t, i18n } = useTranslation();
  const { colors, spacing } = useTheme();

  if (state.status === 'idle') return null;
  if (state.status === 'locating' || state.status === 'sending') {
    return (
      <Card style={{ alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText accessibilityLiveRegion="polite">
          {state.status === 'locating' ? t('attendance.locating') : t('common.loading')}
        </AppText>
      </Card>
    );
  }
  if (state.status === 'error') {
    return (
      <Card style={{ borderColor: colors.danger, borderWidth: 2 }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <PopIn key={state.code}>
            <Ionicons name="close-circle" size={40} color={colors.danger} />
          </PopIn>
          <AppText variant="heading" tone="danger" style={{ flex: 1 }} accessibilityRole="alert">
            {t(`errors.${state.code}`)}
          </AppText>
        </View>
      </Card>
    );
  }
  const time = state.at.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  return (
    <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <PopIn key={state.at.getTime()}>
          <Ionicons
            name={state.queued ? 'cloud-offline' : 'checkmark-circle'}
            size={48}
            color={state.queued ? colors.reward : colors.primary}
          />
        </PopIn>
        <AppText variant="heading" style={{ flex: 1 }} accessibilityRole="alert">
          {state.kind === 'in'
            ? t('attendance.checkedIn', { time })
            : t('attendance.checkedOut', { time })}
        </AppText>
      </View>
      {state.queued ? <AppText tone="muted">{t('attendance.queued')}</AppText> : null}
    </Card>
  );
}
