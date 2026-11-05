import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/components/ui/Placeholder';
import { Screen } from '@/components/ui/Screen';

export default function QuestsScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top']}>
      <Placeholder
        icon="compass-outline"
        title={t('tabs.quests')}
        body={t('placeholders.quests')}
      />
    </Screen>
  );
}
