import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useHoursReport } from '@/features/admin/queries';
import {
  buildReportCsv,
  localDateStamp,
  reportPeriod,
  summarizeByVolunteer,
  type ReportPeriodKind,
} from '@/features/admin/report';
import { buildReportHtml } from '@/features/admin/report-html';
import { useMyOrganizations } from '@/features/organizations/queries';
import { exportPdf } from '@/lib/pdf-export';
import { shareTextFile } from '@/lib/share-file';
import { useFormatDuration } from '@/lib/use-format-duration';
import { useNow } from '@/lib/use-now';
import { useTheme } from '@/theme/ThemeProvider';

/** Отчёт по подтверждённым часам за период: сводка на экране, экспорт CSV и PDF. */
export default function ReportsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, spacing } = useTheme();
  const duration = useFormatDuration();
  const now = useNow(60 * 60_000);
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const orgName = useMyOrganizations().data?.find((o) => o.id === orgId)?.name ?? '';
  const [kind, setKind] = useState<ReportPeriodKind>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [applied, setApplied] = useState({ from: '', to: '' });
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(
    () => reportPeriod(kind, now, kind === 'custom' ? applied : undefined),
    [kind, now, applied],
  );
  const report = useHoursReport(orgId, period);
  const rows = useMemo(() => report.data ?? [], [report.data]);
  const summary = useMemo(() => summarizeByVolunteer(rows), [rows]);
  const totalMinutes = summary.reduce((sum, s) => sum + s.minutes, 0);

  const periodText = period
    ? `${period.from.toLocaleDateString(i18n.language)} — ${new Date(period.to.getTime() - 1).toLocaleDateString(i18n.language)}`
    : '';
  const fileBase = `taza-niyet-${orgName.replace(/[^\p{L}\p{N}]+/gu, '-')}-${period ? localDateStamp(period.from) : ''}`;
  const r = (key: string) => t(`admin.report.${key}` as 'admin.report.title');

  const downloadCsv = async () => {
    setError(null);
    try {
      const csv = buildReportCsv(
        rows,
        {
          date: r('date'),
          quest: r('quest'),
          difficulty: r('difficulty'),
          volunteer: r('volunteer'),
          minutes: r('minutes'),
          hours: r('hours'),
          rating: r('rating'),
          points: r('points'),
          confirmedBy: r('confirmedBy'),
          confirmedAt: r('confirmedAt'),
          difficulties: {
            easy: t('quests.difficulties.easy'),
            medium: t('quests.difficulties.medium'),
            hard: t('quests.difficulties.hard'),
            extreme: t('quests.difficulties.extreme'),
          },
        },
        i18n.language,
      );
      await shareTextFile(`${fileBase}.csv`, csv, 'text/csv');
    } catch {
      setError(t('errors.generic'));
    }
  };

  const downloadPdf = async () => {
    setError(null);
    try {
      const html = buildReportHtml({
        orgName,
        periodText,
        rows,
        summary,
        locale: i18n.language,
        generatedAt: new Date(),
        labels: {
          title: r('title'),
          period: r('period'),
          generated: r('generated'),
          summary: r('summary'),
          details: r('details'),
          volunteer: r('volunteer'),
          quests: r('quests'),
          hours: r('hours'),
          points: r('points'),
          rating: r('rating'),
          date: r('date'),
          quest: r('quest'),
          total: r('total'),
          empty: t('admin.reportEmpty'),
          duration,
        },
      });
      await exportPdf(html, `${r('title')} — ${orgName}`);
    } catch {
      setError(t('errors.generic'));
    }
  };

  return (
    <Screen scroll edges={['bottom']}>
      <ChoiceGroup<ReportPeriodKind>
        label={t('admin.reportPeriod')}
        value={kind}
        options={(['month', 'lastMonth', 'year', 'custom'] as const).map((k) => ({
          value: k,
          label: t(`admin.periods.${k}`),
        }))}
        onChange={setKind}
      />
      {kind === 'custom' ? (
        <Card>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('admin.from')}
                value={customFrom}
                onChangeText={setCustomFrom}
                inputMode="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label={t('admin.to')}
                value={customTo}
                onChangeText={setCustomTo}
                inputMode="numeric"
              />
            </View>
          </View>
          {applied.from && !period ? (
            <AppText tone="danger" accessibilityRole="alert">
              {t('errors.invalid_period')}
            </AppText>
          ) : null}
          <Button
            variant="secondary"
            title={t('admin.show')}
            onPress={() => setApplied({ from: customFrom, to: customTo })}
          />
        </Card>
      ) : null}

      {period ? <AppText tone="muted">{periodText}</AppText> : null}
      <QueryState
        isLoading={report.isLoading}
        error={report.error}
        onRetry={() => void report.refetch()}
      />

      {report.data ? (
        rows.length === 0 ? (
          <AppText tone="muted">{t('admin.reportEmpty')}</AppText>
        ) : (
          <>
            <Card style={{ borderColor: colors.primary, borderWidth: 2 }}>
              <AppText variant="heading" tone="primary">
                {t('admin.totalHours', { time: duration(totalMinutes) })}
              </AppText>
              <AppText tone="muted">
                {t('admin.totalVolunteers', { count: summary.length })}
              </AppText>
            </Card>
            <Card>
              <AppText variant="heading">{r('summary')}</AppText>
              {summary.map((s) => (
                <View
                  key={s.volunteerId}
                  accessible
                  style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs }}
                >
                  <AppText style={{ flex: 1 }}>{s.name || '—'}</AppText>
                  <AppText variant="bodyStrong">{duration(s.minutes)}</AppText>
                  <AppText tone="muted" style={{ minWidth: 56, textAlign: 'right' }}>
                    {s.points}
                  </AppText>
                </View>
              ))}
            </Card>
            <Button title={t('admin.exportCsv')} onPress={() => void downloadCsv()} />
            <Button
              variant="secondary"
              title={t('admin.exportPdf')}
              onPress={() => void downloadPdf()}
            />
          </>
        )
      ) : null}
      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}
