import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

import { mapAuthError } from '../api';
import { parseContact, signInFormSchema, type Contact, type SignInForm } from '../schemas';

interface SignInFormProps {
  onSubmit: (contact: Contact) => Promise<void>;
}

export function SignInFormView({ onSubmit }: SignInFormProps) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { contact: '' },
  });

  const submit = handleSubmit(async ({ contact }) => {
    setServerError(null);
    const parsed = parseContact(contact);
    if (!parsed) return; // уже отсечено схемой
    try {
      await onSubmit(parsed);
    } catch (error) {
      setServerError(t(`auth.errors.${mapAuthError(error).code}`));
    }
  });

  return (
    <View style={{ gap: 16 }}>
      <Controller
        control={control}
        name="contact"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t('auth.contactLabel')}
            placeholder={t('auth.contactPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            inputMode="email"
            returnKeyType="send"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            onSubmitEditing={() => void submit()}
            error={errors.contact ? t('auth.errors.invalidContact') : undefined}
          />
        )}
      />
      {serverError ? (
        <AppText tone="danger" accessibilityRole="alert">
          {serverError}
        </AppText>
      ) : null}
      <Button title={t('auth.sendCode')} onPress={() => void submit()} loading={isSubmitting} />
    </View>
  );
}
