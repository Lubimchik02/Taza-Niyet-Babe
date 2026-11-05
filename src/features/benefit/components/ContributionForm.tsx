import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

import { useSetContribution } from '../queries';

interface ContributionFormProps {
  questId: string;
  bags: number | null;
  area: number | null;
}

/** Пусто — null; иначе целое неотрицательное число, или NaN для ошибки. */
export function parseCount(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/** Координатор вносит вклад команды: мешки мусора и площадь — это видно в «Моей выгоде». */
export function ContributionForm({ questId, bags, area }: ContributionFormProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const save = useSetContribution();
  const [bagsText, setBagsText] = useState(bags === null ? '' : String(bags));
  const [areaText, setAreaText] = useState(area === null ? '' : String(area));
  const [message, setMessage] = useState<{ tone: 'primary' | 'danger'; text: string } | null>(null);

  const submit = async () => {
    const b = parseCount(bagsText);
    const a = parseCount(areaText);
    if (Number.isNaN(b) || Number.isNaN(a)) {
      setMessage({ tone: 'danger', text: t('errors.invalid_contribution') });
      return;
    }
    try {
      await save.mutateAsync({ questId, bags: b, area: a });
      setMessage({ tone: 'primary', text: t('attendance.contributionSaved') });
    } catch (e) {
      setMessage({ tone: 'danger', text: t(`errors.${toDbError(e).code}`) });
    }
  };

  return (
    <Card>
      <AppText variant="heading">{t('attendance.contributionTitle')}</AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <TextField
            label={t('attendance.bagsLabel')}
            value={bagsText}
            onChangeText={setBagsText}
            inputMode="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextField
            label={t('attendance.areaLabel')}
            value={areaText}
            onChangeText={setAreaText}
            inputMode="numeric"
          />
        </View>
      </View>
      {message ? (
        <AppText
          tone={message.tone}
          accessibilityRole={message.tone === 'danger' ? 'alert' : undefined}
          accessibilityLiveRegion="polite"
        >
          {message.text}
        </AppText>
      ) : null}
      <Button
        variant="secondary"
        title={t('attendance.saveContribution')}
        loading={save.isPending}
        onPress={() => void submit()}
      />
    </Card>
  );
}
