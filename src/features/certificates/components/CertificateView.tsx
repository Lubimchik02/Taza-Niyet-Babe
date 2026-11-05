import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { Language } from '@/i18n/languages';
import { useFormatDuration } from '@/lib/use-format-duration';
import { useTheme } from '@/theme/ThemeProvider';

import type { CertificateData } from '../template';

/**
 * Сертификат на экране. Один и тот же вид у владельца и на публичной странице проверки:
 * владелец видит ровно то, что увидит вуз или работодатель.
 */
export function CertificateView({ data }: { data: CertificateData }) {
  const { t, i18n } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const duration = useFormatDuration();
  const lang = (['kk', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'ru') as Language;
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  const revoked = data.revoked_at !== null;

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ borderColor: revoked ? colors.danger : colors.primary, borderWidth: 2 }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
          <Ionicons
            name={revoked ? 'close-circle' : 'shield-checkmark'}
            size={44}
            color={revoked ? colors.danger : colors.primary}
          />
          <View style={{ flex: 1 }}>
            <AppText
              variant="heading"
              tone={revoked ? 'danger' : 'primary'}
              accessibilityRole="header"
            >
              {revoked ? t('certificates.verify.revoked') : t('certificates.verify.valid')}
            </AppText>
            <AppText tone="muted">
              {revoked
                ? t('certificates.verify.revokedHint', { date: date(data.revoked_at ?? '') })
                : t('certificates.verify.validHint')}
            </AppText>
          </View>
        </View>
      </Card>

      <Card>
        <AppText tone="muted">{t('certificates.verify.holder')}</AppText>
        <AppText variant="title">{data.full_name}</AppText>
        <AppText>
          {t('certificates.pdf.organization')}:{' '}
          <AppText variant="bodyStrong">{data.org_name}</AppText>
        </AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Stat value={duration(data.total_minutes)} label={t('certificates.pdf.hours')} />
          <Stat value={String(data.quests_count)} label={t('certificates.pdf.quests')} />
          <Stat
            value={
              data.avg_rating === null
                ? '—'
                : data.avg_rating.toLocaleString(i18n.language, { maximumFractionDigits: 1 })
            }
            label={t('certificates.pdf.avgRating')}
          />
        </View>
        <AppText variant="caption" tone="muted">
          {t('certificates.issuedAt', { date: date(data.issued_at) })} ·{' '}
          {t('certificates.pdf.number')} {data.id}
        </AppText>
      </Card>

      {data.skills.some((s) => s.xp > 0) ? (
        <Card>
          <AppText variant="heading">{t('certificates.pdf.skills')}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {data.skills
              .filter((s) => s.xp > 0)
              .map((s) => (
                <View
                  key={s.code}
                  style={{
                    backgroundColor: colors.primaryMuted,
                    borderRadius: radius.pill,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <AppText variant="caption" tone="primary" style={{ fontWeight: '700' }}>
                    {s.name[lang]} · {s.xp} XP
                  </AppText>
                </View>
              ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <AppText variant="heading">{t('certificates.pdf.questList')}</AppText>
        {data.quests.map((q) => (
          <View key={`${q.date}-${q.title}`} style={{ gap: 2 }}>
            <AppText variant="bodyStrong">{q.title}</AppText>
            <AppText tone="muted">
              {date(q.date)} · {duration(q.minutes)} ·{' '}
              {'★'.repeat(Math.max(0, Math.min(5, q.rating)))}
            </AppText>
          </View>
        ))}
      </Card>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        minWidth: 96,
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <AppText variant="heading" tone="primary">
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
