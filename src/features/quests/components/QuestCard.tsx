import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { questRewardRange } from '@/features/points/config';
import { difficultyColors } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import type { FeedQuest } from '../api';
import { distanceParts } from '../geo';
import { durationMinutes, formatQuestTime } from '../time';
import { DifficultyBadge } from './DifficultyBadge';
import { PlacesBar } from './PlacesBar';

interface QuestCardProps {
  quest: FeedQuest & { distanceM: number | null };
}

export function QuestCard({ quest }: QuestCardProps) {
  const { t, i18n } = useTranslation();
  const { colors, radius, spacing } = useTheme();
  const reward = questRewardRange(
    quest.difficulty,
    durationMinutes(quest.starts_at, quest.ends_at),
  );
  const when = formatQuestTime(quest.starts_at, quest.ends_at, i18n.language);
  const distance = quest.distanceM === null ? null : distanceParts(quest.distanceM, i18n.language);
  const distanceText = distance
    ? t('quests.fromYou', {
        distance: t(distance.unit === 'm' ? 'quests.unitM' : 'quests.unitKm', {
          value: distance.value,
        }),
      })
    : null;

  return (
    <Pressable
      role="button"
      aria-label={`${quest.title}, ${t(`quests.difficulties.${quest.difficulty}`)}, ${when}`}
      onPress={() => router.push({ pathname: '/quests/[questId]', params: { questId: quest.id } })}
      style={({ pressed }) => ({
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* Полоса цвета сложности — «квестовая» карточка. */}
      <View style={{ width: 8, backgroundColor: difficultyColors[quest.difficulty].bg }} />
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.sm }}>
        <View
          style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <DifficultyBadge difficulty={quest.difficulty} />
          {quest.status !== 'published' ? (
            <AppText variant="caption" tone="muted">
              {t(`quests.statuses.${quest.status}`)}
            </AppText>
          ) : null}
          {quest.my_status === 'signed_up' ? (
            <AppText variant="caption" tone="primary" style={{ fontWeight: '700' }}>
              ✓ {t('quests.signedUp')}
            </AppText>
          ) : quest.my_status === 'waitlisted' ? (
            <AppText variant="caption" tone="primary" style={{ fontWeight: '700' }}>
              {t('quests.waitlist')}
            </AppText>
          ) : null}
        </View>

        <AppText variant="heading">{quest.title}</AppText>

        <View style={{ gap: spacing.xs }}>
          <Row icon="calendar-outline" text={when} />
          <Row
            icon="location-outline"
            text={distanceText ? `${quest.address} · ${distanceText}` : quest.address}
          />
          <Row
            icon="star-outline"
            text={`${t('quests.reward')}: ${t('quests.rewardValue', reward)}`}
            color={colors.text}
          />
        </View>

        <PlacesBar taken={quest.taken} capacity={quest.capacity} waitlisted={quest.waitlisted} />
      </View>
    </Pressable>
  );
}

function Row({
  icon,
  text,
  color,
}: {
  icon: 'calendar-outline' | 'location-outline' | 'star-outline';
  text: string;
  color?: string;
}) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginTop: 3 }} />
      <AppText tone="muted" style={[{ flex: 1 }, color ? { color } : null]}>
        {text}
      </AppText>
    </View>
  );
}
