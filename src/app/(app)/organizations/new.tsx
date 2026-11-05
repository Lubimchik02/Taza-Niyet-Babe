import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useCreateOrganization } from '@/features/organizations/queries';
import { createOrgSchema, type CreateOrgForm } from '@/features/organizations/schemas';
import { slugify } from '@/features/organizations/slug';
import { toDbError } from '@/lib/db-errors';

export default function NewOrganizationScreen() {
  const { t } = useTranslation();
  const create = useCreateOrganization();
  const [serverError, setServerError] = useState<string | null>(null);
  // Пока пользователь сам не правил адрес, он подстраивается под название.
  const slugTouched = useRef(false);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrgForm>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: '', slug: '', description: '' },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const org = await create.mutateAsync(values);
      router.replace({ pathname: '/organizations/[orgId]', params: { orgId: org.id } });
    } catch (error) {
      setServerError(t(`errors.${toDbError(error).code}`));
    }
  });

  const fieldError = (key: string | undefined) =>
    key ? t(`organizations.formErrors.${key as 'nameLength'}`) : undefined;

  return (
    <Screen scroll edges={['bottom']}>
      <Controller
        control={control}
        name="name"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('organizations.form.name')}
            value={value}
            onBlur={onBlur}
            onChangeText={(text) => {
              onChange(text);
              if (!slugTouched.current) setValue('slug', slugify(text));
            }}
            error={fieldError(errors.name?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name="slug"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('organizations.form.slug')}
            autoCapitalize="none"
            autoCorrect={false}
            value={value}
            onBlur={onBlur}
            onChangeText={(text) => {
              slugTouched.current = true;
              onChange(text.toLowerCase());
            }}
            error={fieldError(errors.slug?.message)}
          />
        )}
      />
      <AppText variant="caption" tone="muted">
        {t('organizations.form.slugHint')}
      </AppText>
      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            label={t('organizations.form.description')}
            multiline
            numberOfLines={4}
            style={{ minHeight: 120, textAlignVertical: 'top', paddingTop: 12 }}
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={fieldError(errors.description?.message)}
          />
        )}
      />
      {serverError ? (
        <AppText tone="danger" accessibilityRole="alert">
          {serverError}
        </AppText>
      ) : null}
      <Button
        title={t('organizations.form.submit')}
        loading={isSubmitting}
        onPress={() => void submit()}
      />
    </Screen>
  );
}
