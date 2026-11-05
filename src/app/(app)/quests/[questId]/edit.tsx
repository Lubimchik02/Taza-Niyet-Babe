import { router, useLocalSearchParams } from 'expo-router';

import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { QuestForm } from '@/features/quests/components/QuestForm';
import { useQuest } from '@/features/quests/queries';

export default function EditQuestScreen() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const quest = useQuest(questId);
  const q = quest.data;

  return (
    <Screen scroll edges={['bottom']}>
      <QueryState
        isLoading={quest.isLoading}
        error={
          quest.error ??
          (quest.isSuccess && (!q || !q.can_manage)
            ? new Error(q ? 'not_allowed' : 'quest_not_found')
            : null)
        }
        onRetry={() => void quest.refetch()}
      />
      {q?.can_manage ? (
        <QuestForm orgId={q.org_id} quest={q} onSaved={() => router.back()} />
      ) : null}
    </Screen>
  );
}
