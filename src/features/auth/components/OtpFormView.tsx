import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

import { mapAuthError } from '../api';
import { OTP_LENGTH, otpFormSchema, type OtpForm } from '../schemas';

export const RESEND_COOLDOWN_SECONDS = 60;

interface OtpFormViewProps {
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
}

function useCountdown(initial: number) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, () => setLeft(initial)] as const;
}

export function OtpFormView({ onVerify, onResend }: OtpFormViewProps) {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [secondsLeft, restartCountdown] = useCountdown(RESEND_COOLDOWN_SECONDS);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtpForm>({ resolver: zodResolver(otpFormSchema), defaultValues: { code: '' } });

  const submit = handleSubmit(async ({ code }) => {
    setServerError(null);
    try {
      await onVerify(code);
    } catch (error) {
      setServerError(t(`auth.errors.${mapAuthError(error).code}`));
    }
  });

  const resend = async () => {
    setServerError(null);
    setNotice(null);
    setResending(true);
    try {
      await onResend();
      setNotice(t('auth.codeSent'));
      restartCountdown();
    } catch (error) {
      setServerError(t(`auth.errors.${mapAuthError(error).code}`));
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t('auth.codeLabel')}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            autoFocus
            value={value}
            onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
            onBlur={onBlur}
            onSubmitEditing={() => void submit()}
            style={{ fontSize: 28, letterSpacing: 8, textAlign: 'center' }}
            error={errors.code ? t('auth.errors.invalidCode') : undefined}
          />
        )}
      />
      {serverError ? (
        <AppText tone="danger" accessibilityRole="alert">
          {serverError}
        </AppText>
      ) : null}
      {notice ? (
        <AppText tone="primary" accessibilityLiveRegion="polite">
          {notice}
        </AppText>
      ) : null}
      <Button title={t('auth.verify')} onPress={() => void submit()} loading={isSubmitting} />
      <Button
        variant="ghost"
        title={secondsLeft > 0 ? t('auth.resendIn', { seconds: secondsLeft }) : t('auth.resend')}
        disabled={secondsLeft > 0}
        loading={resending}
        onPress={() => void resend()}
      />
    </View>
  );
}
