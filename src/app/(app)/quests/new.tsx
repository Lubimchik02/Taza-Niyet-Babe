import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { useMyOrganizations } from '@/features/organizations/queries';
import { QuestForm } from '@/features/quests/components/QuestForm';

export default function NewQuestScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ orgId?: string }>();
  const orgs = useMyOrganizations();
  const managed = orgs.data?.filter((o) => o.role === 'admin' || o.role === 'coordinator') ?? [];
  const [chosen, setChosen] = useState<string | null>(params.orgId ?? null);
  const orgId = chosen ?? (managed.length === 1 ? (managed[0]?.id ?? null) : null);

  return (
    <Screen scroll edges={['bottom']}>
      <QueryState
        isLoading={orgs.isLoading}
        error={orgs.error}
        onRetry={() => void orgs.refetch()}
      />
      {managed.length > 1 ? (
        <ChoiceGroup<string>
          label={t('quests.chooseOrg')}
          value={orgId ?? ''}
          options={managed.map((o) => ({ value: o.id, label: o.name }))}
          onChange={setChosen}
        />
      ) : null}
      {orgId ? (
        <QuestForm
          key={orgId}
          orgId={orgId}
          quest={null}
          onSaved={(questId) =>
            router.replace({ pathname: '/quests/[questId]', params: { questId } })
          }
        />
      ) : null}
    </Screen>
  );
}
