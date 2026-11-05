import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { AttendanceResult } from '@/features/attendance/components/AttendanceResult';
import { parseCheckinToken } from '@/features/attendance/qr';
import { useQrAttendance } from '@/features/attendance/use-qr-attendance';

/**
 * Отметка по QR: открывается из сканера или системной камерой по ссылке tazaniyet://checkin/<токен>.
 * mode=out — «Ушёл раньше / ухожу».
 */
export default function CheckinScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token: string; mode?: 'in' | 'out' }>();
  const parsed = typeof params.token === 'string' ? parseCheckinToken(params.token) : null;
  const mode = params.mode === 'out' ? 'out' : 'in';
  const { state, run } = useQrAttendance(parsed?.questId ?? null);
  const started = useRef(false);

  useEffect(() => {
    // Отметка отправляется один раз за открытие экрана.
    if (started.current || !parsed) return;
    started.current = true;
    void run(parsed.token, mode);
  }, [parsed, mode, run]);

  const openQuest = () =>
    parsed
      ? router.replace({ pathname: '/quests/[questId]', params: { questId: parsed.questId } })
      : router.replace('/');

  return (
    <Screen scroll>
      <AttendanceResult state={parsed ? state : { status: 'error', code: 'qr_invalid' }} />
      {state.status === 'error' || !parsed ? (
        <Button
          title={t('attendance.scanIn')}
          onPress={() => router.replace({ pathname: '/scan', params: { mode } })}
        />
      ) : null}
      <Button variant="secondary" title={t('quests.list')} onPress={openQuest} />
    </Screen>
  );
}
