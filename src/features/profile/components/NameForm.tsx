import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

import { useUpdateFullName } from '../queries';
import { fullNameSchema } from '../schemas';

interface NameFormProps {
  /** Начальное значение; форму монтируют, когда профиль уже загружен. */
  initialName: string;
  /** Пояснение над полем — например, зачем имя нужно прямо сейчас. */
  prompt?: string;
  onSaved?: () => void;
}

export function NameForm({ initialName, prompt, onSaved }: NameFormProps) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const update = useUpdateFullName();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaved(false);
    const parsed = fullNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(t('profile.nameRequired'));
      return;
    }
    setError(undefined);
    try {
      await update.mutateAsync(parsed.data);
      setSaved(true);
      onSaved?.();
    } catch (e) {
      setError(t(`errors.${toDbError(e).code}`));
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      {prompt ? <AppText>{prompt}</AppText> : null}
      <TextField
        label={t('profile.name')}
        value={name}
        onChangeText={(text) => {
          setSaved(false);
          setName(text);
        }}
        autoComplete="name"
        textContentType="name"
        maxLength={120}
        onSubmitEditing={() => void save()}
        error={error}
      />
      <Button
        variant="secondary"
        title={t('profile.save')}
        loading={update.isPending}
        disabled={name.trim() === initialName.trim() && initialName !== ''}
        onPress={() => void save()}
      />
      {saved ? (
        <AppText tone="primary" accessibilityLiveRegion="polite">
          {t('profile.saved')}
        </AppText>
      ) : null}
    </View>
  );
}
