import type { QuestDifficulty } from '@/lib/db';

import type { LatLng } from '../geo';

export interface QuestMapProps {
  quests: { id: string; title: string; difficulty: QuestDifficulty; lat: number; lng: number }[];
  origin: LatLng | null;
}
