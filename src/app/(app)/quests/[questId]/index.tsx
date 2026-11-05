import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { POINTS_PER_HOUR, questRewardRange } from '@/features/points/config';
import { DifficultyBadge } from '@/features/quests/components/DifficultyBadge';
import { PlacesBar } from '@/features/quests/components/PlacesBar';
import { SignupPanel } from '@/features/quests/components/SignupPanel';
import { MyAttendanceCard } from '@/features/attendance/components/MyAttendanceCard';
import { ShiftActions } from '@/features/attendance/components/ShiftActions';
import { buildRouteUrl } from '@/features/quests/geo';
import { useParticipants, useQuest, useQuestPhotoUrl } from '@/features/quests/queries';
import { durationMinutes, formatQuestTime } from '@/features/quests/time';
import type { Language } from '@/i18n/languages';
import { useTheme } from '@/theme/ThemeProvider';

export default function QuestScreen() {
  const { t, i18n } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const quest = useQuest(questId);
  const q = quest.data;
  const photo = useQuestPhotoUrl(q?.before_photo_path ?? null);
  const participants = useParticipants(questId, q?.can_manage ?? false);

  if (!q) {
    return (
      <Screen edges={['bottom']}>
        <QueryState
          isLoading={quest.isLoading}
          error={quest.error ?? (quest.isSuccess ? new Error('quest_not_found') : null)}
          onRetry={() => void quest.refetch()}
        />
      </Screen>
    );
  }

  const minutes = durationMinutes(q.starts_at, q.ends_at);
  const reward = questRewardRange(q.difficulty, minutes);
  const lang = (['kk', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'ru') as Language;
  const contactIsPhone =
    q.coordinator_contact && /^[+\d][\d\s()-]{6,}$/.test(q.coordinator_contact);
  const signedUp = participants.data?.filter((p) => p.status === 'signed_up') ?? [];
  const waitlist = participants.data?.filter((p) => p.status === 'waitlisted') ?? [];

  return (
    <Screen scroll edges={['bottom']}>
      <Stack.Screen options={{ title: q.title }} />

      {photo.data ? (
        <Image
          source={{ uri: photo.data }}
          accessibilityLabel={t('quests.photoBeforeLabel')}
          style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg }}
          contentFit="cover"
        />
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <View
          style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <DifficultyBadge difficulty={q.difficulty} />
          {q.status !== 'published' ? (
            <AppText tone="muted">{t(`quests.statuses.${q.status}`)}</AppText>
          ) : null}
        </View>
        <AppText variant="title">{q.title}</AppText>
        <AppText tone="muted">{q.org_name}</AppText>
        {q.description ? <AppText>{q.description}</AppText> : null}
      </View>

      {q.can_manage ? (
        <ShiftActions questId={q.id} status={q.status} startsAt={q.starts_at} />
      ) : null}
      <SignupPanel quest={q} />
      <MyAttendanceCard
        questId={q.id}
        questStatus={q.status}
        signedUp={q.my_status === 'signed_up'}
      />

      <Card>
        <Section icon="calendar-outline" title={t('quests.when')}>
          <AppText>{formatQuestTime(q.starts_at, q.ends_at, i18n.language)}</AppText>
          <AppText tone="muted">
            {t('quests.duration', {
              hours: (minutes / 60).toLocaleString(i18n.language, { maximumFractionDigits: 1 }),
            })}
          </AppText>
        </Section>
        <Section icon="location-outline" title={t('quests.where')}>
          <AppText>{q.address}</AppText>
          <Button
            variant="secondary"
            title={t('quests.route')}
            onPress={() => void Linking.openURL(buildRouteUrl(q, q.title))}
          />
        </Section>
        <PlacesBar taken={q.taken} capacity={q.capacity} waitlisted={q.waitlisted} />
      </Card>

      <Card style={{ borderColor: colors.reward, borderWidth: 2 }}>
        <Section icon="star" iconColor={colors.reward} title={t('quests.reward')}>
          <AppText variant="heading">{t('quests.rewardValue', reward)}</AppText>
          <AppText tone="muted">
            {t('quests.rewardHint', { perHour: POINTS_PER_HOUR[q.difficulty] })}
          </AppText>
        </Section>
        {q.skills.length > 0 ? (
          <Section icon="trending-up-outline" title={t('quests.skills')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {q.skills.map((s) => (
                <View
                  key={s.id}
                  style={{
                    backgroundColor: colors.primaryMuted,
                    borderRadius: radius.pill,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <AppText variant="caption" tone="primary" style={{ fontWeight: '700' }}>
                    {s.name[lang]} · +{s.xp} XP
                  </AppText>
                </View>
              ))}
            </View>
          </Section>
        ) : null}
      </Card>

      {q.bring_items.length > 0 || q.provided_items.length > 0 ? (
        <Card>
          {q.bring_items.length > 0 ? (
            <Section icon="bag-handle-outline" title={t('quests.bring')}>
              {q.bring_items.map((item) => (
                <AppText key={item}>• {item}</AppText>
              ))}
            </Section>
          ) : null}
          {q.provided_items.length > 0 ? (
            <Section icon="gift-outline" title={t('quests.provided')}>
              {q.provided_items.map((item) => (
                <AppText key={item}>• {item}</AppText>
              ))}
            </Section>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <Section icon="person-outline" title={t('quests.coordinator')}>
          <AppText variant="bodyStrong">{q.coordinator_name || '—'}</AppText>
          {q.coordinator_contact ? (
            contactIsPhone ? (
              <Button
                variant="ghost"
                title={t('quests.contact', { contact: q.coordinator_contact })}
                onPress={() =>
                  void Linking.openURL(`tel:${q.coordinator_contact?.replace(/[^\d+]/g, '')}`)
                }
              />
            ) : (
              <AppText selectable>
                {t('quests.contact', { contact: q.coordinator_contact })}
              </AppText>
            )
          ) : null}
        </Section>
      </Card>

      {q.can_manage ? (
        <Card>
          <AppText variant="heading">
            {t('quests.participants')} · {signedUp.length}
          </AppText>
          <QueryState
            isLoading={participants.isLoading}
            error={participants.error}
            onRetry={() => void participants.refetch()}
          />
          {participants.data?.length === 0 ? (
            <AppText tone="muted">{t('quests.noParticipants')}</AppText>
          ) : null}
          {signedUp.map((p) => (
            <AppText key={p.user_id}>• {p.full_name || '—'}</AppText>
          ))}
          {waitlist.length > 0 ? (
            <>
              <AppText variant="bodyStrong">{t('quests.waitlist')}</AppText>
              {waitlist.map((p) => (
                <AppText key={p.user_id} tone="muted">
                  {p.queue_position}. {p.full_name || '—'}
                </AppText>
              ))}
            </>
          ) : null}
          {q.status === 'draft' || q.status === 'published' ? (
            <Button
              variant="secondary"
              title={t('quests.edit')}
              onPress={() =>
                router.push({ pathname: '/quests/[questId]/edit', params: { questId: q.id } })
              }
            />
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

function Section({
  icon,
  iconColor,
  title,
  children,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  title: string;
  children: ReactNode;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name={icon} size={20} color={iconColor ?? colors.primary} />
        <AppText variant="bodyStrong">{title}</AppText>
      </View>
      <View style={{ gap: spacing.xs, paddingLeft: 28 }}>{children}</View>
    </View>
  );
}
