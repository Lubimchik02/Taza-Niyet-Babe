import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import type { Task } from '@/features/admin/api';
import { useCreateTask, useSetTaskStatus, useTasks } from '@/features/admin/queries';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

const STATUSES = ['open', 'in_progress', 'done', 'cancelled'] as const;

/** Задачи «сверху»: «такое-то место загрязнено» → квест для волонтёров. */
export default function TasksScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const tasks = useTasks(orgId);
  const create = useCreateTask();
  const setStatus = useSetTaskStatus(orgId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (title.trim().length < 3) {
      setError(t('quests.formErrors.titleLength'));
      return;
    }
    try {
      await create.mutateAsync({ orgId, title, description, address });
      setTitle('');
      setDescription('');
      setAddress('');
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  return (
    <Screen scroll edges={['bottom']}>
      <Card>
        <AppText variant="heading">{t('admin.newTask')}</AppText>
        <TextField
          label={t('admin.taskTitle')}
          value={title}
          onChangeText={setTitle}
          maxLength={140}
        />
        <TextField
          label={t('admin.taskDescription')}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextField label={t('admin.taskAddress')} value={address} onChangeText={setAddress} />
        {error ? (
          <AppText tone="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        <Button
          title={t('admin.createTask')}
          loading={create.isPending}
          onPress={() => void submit()}
        />
      </Card>

      <QueryState
        isLoading={tasks.isLoading}
        error={tasks.error}
        onRetry={() => void tasks.refetch()}
      />
      {tasks.data?.length === 0 ? <AppText tone="muted">{t('admin.noTasks')}</AppText> : null}
      {tasks.data?.map((task) => (
        <Card key={task.id}>
          <AppText variant="heading">{task.title}</AppText>
          {task.description ? <AppText tone="muted">{task.description}</AppText> : null}
          {task.address ? <AppText>{task.address}</AppText> : null}
          <AppText variant="caption" tone="muted">
            {t('admin.taskQuests', { count: task.questsCount })}
          </AppText>
          <View style={{ gap: spacing.sm }}>
            <ChoiceGroup<Task['status']>
              label={t('admin.taskStatus')}
              value={task.status}
              options={STATUSES.map((s) => ({ value: s, label: t(`admin.taskStatuses.${s}`) }))}
              onChange={(status) => setStatus.mutate({ taskId: task.id, status })}
            />
            {task.status === 'open' || task.status === 'in_progress' ? (
              <Button
                variant="secondary"
                title={t('admin.createQuestFromTask')}
                onPress={() =>
                  router.push({ pathname: '/quests/new', params: { orgId, taskId: task.id } })
                }
              />
            ) : null}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
