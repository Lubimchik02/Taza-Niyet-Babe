import { useTranslation } from 'react-i18next';

import { Placeholder } from '@/components/ui/Placeholder';
import { Screen } from '@/components/ui/Screen';

export default function BenefitScreen() {
  const { t } = useTranslation();
  return (
    <Screen edges={['top']}>
      <Placeholder
        icon="trophy-outline"
        title={t('tabs.benefit')}
        body={t('placeholders.benefit')}
      />
    </Screen>
  );
}
