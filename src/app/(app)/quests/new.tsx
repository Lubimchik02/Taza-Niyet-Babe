import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { linkQuestToTask, setTaskStatus } from '@/features/admin/api';
import { useTask } from '@/features/admin/queries';
import { useMyOrganizations } from '@/features/organizations/queries';
import { QuestForm } from '@/features/quests/components/QuestForm';

export default function NewQuestScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ orgId?: string; taskId?: string }>();
  const orgs = useMyOrganizations();
  const task = useTask(params.taskId ?? null);
  const managed = orgs.data?.filter((o) => o.role === 'admin' || o.role === 'coordinator') ?? [];
  const [chosen, setChosen] = useState<string | null>(params.orgId ?? null);
  const orgId = chosen ?? (managed.length === 1 ? (managed[0]?.id ?? null) : null);
  const waitingForTask = params.taskId !== undefined && !task.data;

  const onSaved = async (questId: string) => {
    // Квест по задаче «сверху»: привязываем и переводим задачу «в работу».
    if (task.data) {
      await linkQuestToTask(questId, task.data.id);
      if (task.data.status === 'open') await setTaskStatus(task.data.id, 'in_progress');
    }
    router.replace({ pathname: '/quests/[questId]', params: { questId } });
  };

  return (
    <Screen scroll edges={['bottom']}>
      <QueryState
        isLoading={orgs.isLoading || (params.taskId !== undefined && task.isLoading)}
        error={orgs.error ?? task.error}
        onRetry={() => void orgs.refetch()}
      />
      {task.data ? <AppText tone="muted">{task.data.title}</AppText> : null}
      {managed.length > 1 && !params.orgId ? (
        <ChoiceGroup<string>
          label={t('quests.chooseOrg')}
          value={orgId ?? ''}
          options={managed.map((o) => ({ value: o.id, label: o.name }))}
          onChange={setChosen}
        />
      ) : null}
      {orgId && !waitingForTask ? (
        <QuestForm
          key={`${orgId}-${task.data?.id ?? ''}`}
          orgId={orgId}
          quest={null}
          prefill={
            task.data
              ? {
                  title: task.data.title.slice(0, 140),
                  description: task.data.description,
                  address: task.data.address ?? '',
                  lat: task.data.lat === null ? '' : String(task.data.lat),
                  lng: task.data.lng === null ? '' : String(task.data.lng),
                }
              : undefined
          }
          onSaved={(questId) => void onSaved(questId)}
        />
      ) : null}
    </Screen>
  );
}
