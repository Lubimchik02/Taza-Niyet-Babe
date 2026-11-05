import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import type { OrgRole } from '@/lib/db';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

import type { OrgMember } from '../api';
import { useRemoveMember, useSetMemberRole } from '../queries';
import { ORG_ROLES } from '../schemas';
import { RoleBadge } from './RoleBadge';

interface MemberRowProps {
  member: OrgMember;
  isSelf: boolean;
  /** Админ может менять роли и исключать (кроме себя — для этого «Покинуть»). */
  canManage: boolean;
}

export function MemberRow({ member, isSelf, canManage }: MemberRowProps) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const setRole = useSetMemberRole();
  const remove = useRemoveMember();
  const [error, setError] = useState<string | null>(null);
  const name = member.fullName || '—';

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  return (
    <View
      style={{
        gap: spacing.sm,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}
      >
        <AppText variant="bodyStrong" style={{ flexShrink: 1 }}>
          {name}
          {isSelf ? ` (${t('organizations.you')})` : ''}
        </AppText>
        {!canManage ? <RoleBadge role={member.role} /> : null}
      </View>

      {canManage ? (
        <ChoiceGroup<OrgRole>
          label={t('organizations.roleLabel', { name })}
          value={member.role}
          options={ORG_ROLES.map((role) => ({ value: role, label: t(`roles.${role}`) }))}
          onChange={(role) =>
            void run(() => setRole.mutateAsync({ membershipId: member.membershipId, role }))
          }
        />
      ) : null}

      {canManage && !isSelf ? (
        <ConfirmButton
          variant="ghost"
          title={t('organizations.remove')}
          confirmTitle={t('organizations.confirmRemove')}
          loading={remove.isPending}
          onConfirm={() => void run(() => remove.mutateAsync(member.membershipId))}
        />
      ) : null}

      {error ? (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
