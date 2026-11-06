import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QueryState } from '@/components/ui/QueryState';
import { Screen } from '@/components/ui/Screen';
import { useAuditLog } from '@/features/admin/queries';
import { changedFields } from '@/features/admin/report';
import { useTheme } from '@/theme/ThemeProvider';

type Entity =
  | 'organizations'
  | 'memberships'
  | 'tasks'
  | 'quests'
  | 'quest_signups'
  | 'attendance_sessions'
  | 'hour_confirmations'
  | 'disputes'
  | 'certificates'
  | 'org_invites'
  | 'join_requests';
const ENTITIES: readonly string[] = [
  'organizations',
  'memberships',
  'tasks',
  'quests',
  'quest_signups',
  'attendance_sessions',
  'hour_confirmations',
  'disputes',
  'certificates',
  'org_invites',
  'join_requests',
];

/** Неизменяемый журнал: кто, что, когда, какие поля поменялись. */
export default function AuditScreen() {
  const { t, i18n } = useTranslation();
  const { colors, spacing } = useTheme();
  const { orgId } = useLocalSearchParams<{ orgId: string }>();
  const log = useAuditLog(orgId);
  const items = log.data?.pages.flat() ?? [];
  // Частые поля — человеческими словами, редкие — как есть.
  const fieldLabel = (key: string) =>
    i18n.exists(`admin.fields.${key}`) ? t(`admin.fields.${key}` as 'admin.fields.status') : key;

  return (
    <Screen scroll edges={['bottom']}>
      <QueryState isLoading={log.isLoading} error={log.error} onRetry={() => void log.refetch()} />
      {log.data && items.length === 0 ? (
        <EmptyState icon="document-text-outline" title={t('admin.auditEmpty')} />
      ) : null}
      <Card>
        {items.map((item) => {
          const action = ['insert', 'update', 'delete'].includes(item.action)
            ? t(`admin.actions.${item.action as 'insert'}`)
            : item.action;
          const entity = ENTITIES.includes(item.entity)
            ? t(`admin.entities.${item.entity as Entity}`)
            : item.entity;
          const fields = changedFields(
            item.old_value as Record<string, unknown> | null,
            item.new_value as Record<string, unknown> | null,
          );
          return (
            <View
              key={item.id}
              style={{
                gap: 2,
                paddingVertical: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <AppText>
                <AppText variant="bodyStrong">{item.actor_name || t('admin.system')}</AppText>{' '}
                {action} {entity}
              </AppText>
              <AppText variant="caption" tone="muted">
                {new Date(item.created_at).toLocaleString(i18n.language)}
                {fields.length > 0
                  ? ` · ${t('admin.changed', { fields: fields.map(fieldLabel).join(', ') })}`
                  : ''}
              </AppText>
            </View>
          );
        })}
      </Card>
      {log.hasNextPage ? (
        <Button
          variant="secondary"
          title={t('admin.loadMore')}
          loading={log.isFetchingNextPage}
          onPress={() => void log.fetchNextPage()}
        />
      ) : null}
    </Screen>
  );
}
