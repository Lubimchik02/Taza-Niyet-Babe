import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/** «1 ч 30 мин», «2 ч», «45 мин», «0 мин» — единый формат длительности во всём приложении. */
export function useFormatDuration() {
  const { t } = useTranslation();
  return useCallback(
    (totalMinutes: number) => {
      const minutes = Math.max(0, Math.round(totalMinutes));
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      if (h === 0) return t('attendance.minutesOnly', { minutes: m });
      if (m === 0) return t('attendance.hoursOnly', { hours: h });
      return t('attendance.hoursMinutes', { hours: h, minutes: m });
    },
    [t],
  );
}
