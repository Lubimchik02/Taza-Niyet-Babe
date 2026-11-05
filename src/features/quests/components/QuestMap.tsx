/**
 * Веб-версия карты. react-native-maps в браузере не работает, поэтому здесь —
 * список точек со ссылками на внешнюю карту. На iOS/Android Metro берёт QuestMap.native.tsx.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { difficultyColors } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import { buildRouteUrl } from '../geo';
import type { QuestMapProps } from './QuestMap.types';

export default function QuestMap({ quests }: QuestMapProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  return (
    <Card>
      <AppText tone="muted">{t('quests.mapUnavailable')}</AppText>
      {quests.map((q) => (
        <View key={q.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name="location" size={22} color={difficultyColors[q.difficulty].bg} />
          <Pressable
            role="link"
            aria-label={q.title}
            style={{ flex: 1, minHeight: 48, justifyContent: 'center' }}
            onPress={() =>
              router.push({ pathname: '/quests/[questId]', params: { questId: q.id } })
            }
          >
            <AppText variant="bodyStrong">{q.title}</AppText>
          </Pressable>
          <Pressable
            role="link"
            aria-label={`${t('quests.openInMaps')}: ${q.title}`}
            style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => void Linking.openURL(buildRouteUrl(q, q.title, 'web'))}
          >
            <Ionicons name="map-outline" size={24} color={colors.primary} />
          </Pressable>
        </View>
      ))}
    </Card>
  );
}
