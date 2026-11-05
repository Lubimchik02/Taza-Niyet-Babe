import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { difficultyColors } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';

import type { LatLng } from '../geo';
import type { QuestMapProps } from './QuestMap.types';

const ALMATY: LatLng = { lat: 43.2389, lng: 76.8897 };

/** Квесты на карте: маркер цвета сложности, по нажатию на подпись — карточка квеста. */
export default function QuestMap({ quests, origin }: QuestMapProps) {
  const { t } = useTranslation();
  const { radius } = useTheme();
  const center = origin ?? quests[0] ?? ALMATY;

  return (
    <View style={{ height: 420, borderRadius: radius.lg, overflow: 'hidden' }}>
      <MapView
        style={{ flex: 1 }}
        showsUserLocation={origin !== null}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.25,
          longitudeDelta: 0.25,
        }}
        accessibilityLabel={t('quests.map')}
      >
        {quests.map((q) => (
          <Marker
            key={q.id}
            coordinate={{ latitude: q.lat, longitude: q.lng }}
            title={q.title}
            description={t(`quests.difficulties.${q.difficulty}`)}
            pinColor={difficultyColors[q.difficulty].bg}
            onCalloutPress={() =>
              router.push({ pathname: '/quests/[questId]', params: { questId: q.id } })
            }
          />
        ))}
      </MapView>
    </View>
  );
}
