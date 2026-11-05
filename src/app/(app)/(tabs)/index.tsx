import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Placeholder } from '@/components/ui/Placeholder';
import { Screen } from '@/components/ui/Screen';
import { useMyOrganizations } from '@/features/organizations/queries';

export default function QuestsScreen() {
  const { t } = useTranslation();
  const orgs = useMyOrganizations();
  const noOrgs = orgs.data?.length === 0;

  // Лента квестов появится на этапе 4; пока ведём новичка к вступлению в организацию.
  return (
    <Screen edges={['top']}>
      <Placeholder
        icon="compass-outline"
        title={t('tabs.quests')}
        body={noOrgs ? t('placeholders.noOrganizations') : t('placeholders.quests')}
      />
      {noOrgs ? (
        <>
          <Button title={t('organizations.join')} onPress={() => router.push('/organizations')} />
          <Button
            variant="secondary"
            title={t('organizations.find')}
            onPress={() => router.push('/organizations/search')}
          />
        </>
      ) : null}
    </Screen>
  );
}
