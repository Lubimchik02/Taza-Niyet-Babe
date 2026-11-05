import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/components/ui/Placeholder';
import { Screen } from '@/components/ui/Screen';

export default function MyQuestsScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top']}>
      <Placeholder
        icon="list-outline"
        title={t('tabs.myQuests')}
        body={t('placeholders.myQuests')}
      />
    </Screen>
  );
}
