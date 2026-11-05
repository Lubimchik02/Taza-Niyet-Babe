import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch, type Control, type FieldPath } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { TextField } from '@/components/ui/TextField';
import type { Language } from '@/i18n/languages';
import type { QuestDifficulty } from '@/lib/db';
import { DbError, toDbError } from '@/lib/db-errors';
import { useTheme } from '@/theme/ThemeProvider';

import { uploadQuestPhoto, type QuestDetails } from '../api';
import { useOrgTimeZone, useQuestPhotoUrl, useSaveQuest, useSkills } from '../queries';
import {
  DIFFICULTIES,
  questFormSchema,
  toQuestPayload,
  type QuestFormValues,
  type QuestStatusChoice,
} from '../schemas';
import { formatWallClock, formatWallDate, utcToWallTime } from '../time';
import { useDeviceLocation } from '../use-device-location';

interface QuestFormProps {
  orgId: string;
  /** null — новый квест. */
  quest: QuestDetails | null;
  /** Начальные значения нового квеста (например, из задачи «сверху»). */
  prefill?: Partial<QuestFormValues>;
  onSaved: (questId: string) => void;
}

function initialValues(
  quest: QuestDetails | null,
  timeZone: string,
  prefill?: Partial<QuestFormValues>,
): QuestFormValues {
  if (!quest) {
    const empty: QuestFormValues = {
      title: '',
      description: '',
      difficulty: 'easy',
      address: '',
      lat: '',
      lng: '',
      date: '',
      time: '10:00',
      durationHours: '3',
      capacity: '10',
      cancelDeadlineHours: '12',
      radiusM: '300',
      coordinatorContact: '',
      bringItems: '',
      providedItems: '',
      skillIds: [],
    };
    return { ...empty, ...prefill };
  }
  const start = utcToWallTime(new Date(quest.starts_at), timeZone);
  const hours =
    (new Date(quest.ends_at).getTime() - new Date(quest.starts_at).getTime()) / 3600_000;
  return {
    title: quest.title,
    description: quest.description,
    difficulty: quest.difficulty,
    address: quest.address,
    lat: String(quest.lat),
    lng: String(quest.lng),
    date: formatWallDate(start),
    time: formatWallClock(start),
    durationHours: String(Math.round(hours * 100) / 100),
    capacity: String(quest.capacity),
    cancelDeadlineHours: String(quest.cancel_deadline_hours),
    radiusM: String(quest.radius_m),
    coordinatorContact: quest.coordinator_contact ?? '',
    bringItems: quest.bring_items.join(', '),
    providedItems: quest.provided_items.join(', '),
    skillIds: quest.skills.map((s) => s.id),
  };
}

export function QuestForm(props: QuestFormProps) {
  const timeZone = useOrgTimeZone(props.orgId);
  // Форма монтируется, когда известен пояс: от него зависят начальные дата и время.
  if (!timeZone.data) return null;
  return <QuestFormInner {...props} timeZone={timeZone.data} />;
}

function QuestFormInner({
  orgId,
  quest,
  prefill,
  onSaved,
  timeZone,
}: QuestFormProps & { timeZone: string }) {
  const { t, i18n } = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const skills = useSkills();
  const save = useSaveQuest();
  const location = useDeviceLocation();
  const [photoPath, setPhotoPath] = useState<string | null>(quest?.before_photo_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const photoUrl = useQuestPhotoUrl(photoPath);
  const lang = (['kk', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'ru') as Language;

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<QuestFormValues>({
    resolver: zodResolver(questFormSchema),
    defaultValues: initialValues(quest, timeZone, prefill),
  });
  const selectedSkills = useWatch({ control, name: 'skillIds' });

  const fieldError = (key: string | undefined) =>
    key ? t(`quests.formErrors.${key as 'titleLength'}`) : undefined;

  const submit = (status: QuestStatusChoice) =>
    handleSubmit(async (values) => {
      setServerError(null);
      const payload = toQuestPayload(values, timeZone, status);
      if (status === 'published' && new Date(payload.starts_at) <= new Date()) {
        setServerError(t('quests.form.startsInPast'));
        return;
      }
      try {
        const saved = await save.mutateAsync({
          questId: quest?.id ?? null,
          orgId,
          payload: { ...payload, before_photo_path: photoPath ?? '' },
          skillIds: values.skillIds,
        });
        onSaved(saved.id);
      } catch (e) {
        setServerError(t(`errors.${toDbError(e).code}`));
      }
    })();

  // Координаты приходят асинхронно — подставляем их, только когда пользователь попросил.
  const [wantsLocation, setWantsLocation] = useState(false);
  useEffect(() => {
    if (!wantsLocation || !location.coords) return;
    setValue('lat', location.coords.lat.toFixed(6), { shouldValidate: true });
    setValue('lng', location.coords.lng.toFixed(6), { shouldValidate: true });
  }, [wantsLocation, location.coords, setValue]);

  const pickPhoto = async () => {
    setServerError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setUploading(true);
    try {
      setPhotoPath(await uploadQuestPhoto(orgId, asset.uri, asset.mimeType ?? 'image/jpeg'));
    } catch (e) {
      setServerError(t(`errors.${(e instanceof DbError ? e : toDbError(e)).code}`));
    } finally {
      setUploading(false);
    }
  };

  const isDraftOrNew = !quest || quest.status === 'draft';

  return (
    <View style={{ gap: spacing.lg }}>
      <Field
        control={control}
        name="title"
        label={t('quests.form.title')}
        error={fieldError(errors.title?.message)}
      />
      <Field
        control={control}
        name="description"
        label={t('quests.form.description')}
        multiline
        error={fieldError(errors.description?.message)}
      />
      <Controller
        control={control}
        name="difficulty"
        render={({ field }) => (
          <ChoiceGroup<QuestDifficulty>
            label={t('quests.difficulty')}
            value={field.value}
            options={DIFFICULTIES.map((d) => ({ value: d, label: t(`quests.difficulties.${d}`) }))}
            onChange={field.onChange}
          />
        )}
      />

      <Card>
        <Field
          control={control}
          name="address"
          label={t('quests.form.address')}
          error={fieldError(errors.address?.message)}
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Field control={control} name="lat" label={t('quests.form.lat')} inputMode="decimal" />
          </View>
          <View style={{ flex: 1 }}>
            <Field control={control} name="lng" label={t('quests.form.lng')} inputMode="decimal" />
          </View>
        </View>
        {errors.lat || errors.lng ? (
          <AppText variant="caption" tone="danger">
            {fieldError(errors.lat?.message ?? errors.lng?.message)}
          </AppText>
        ) : null}
        <Button
          variant="ghost"
          title={t('quests.form.useMyLocation')}
          loading={location.status === 'loading'}
          onPress={() => {
            setWantsLocation(true);
            void location.request();
          }}
        />
        {location.status === 'denied' ? (
          <AppText variant="caption" tone="danger">
            {t('errors.location_denied')}
          </AppText>
        ) : null}
        <Field
          control={control}
          name="radiusM"
          label={t('quests.form.radiusM')}
          inputMode="numeric"
          error={fieldError(errors.radiusM?.message)}
        />
      </Card>

      <Card>
        <AppText tone="muted">{t('quests.form.timeZoneHint', { tz: timeZone })}</AppText>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 3 }}>
            <Field
              control={control}
              name="date"
              label={t('quests.form.date')}
              inputMode="numeric"
              placeholder="08.11.2026"
            />
          </View>
          <View style={{ flex: 2 }}>
            <Field
              control={control}
              name="time"
              label={t('quests.form.time')}
              inputMode="numeric"
              placeholder="10:00"
            />
          </View>
        </View>
        {errors.date ? (
          <AppText variant="caption" tone="danger">
            {fieldError(errors.date.message)}
          </AppText>
        ) : null}
        <Field
          control={control}
          name="durationHours"
          label={t('quests.form.durationHours')}
          inputMode="decimal"
          error={fieldError(errors.durationHours?.message)}
        />
      </Card>

      <Card>
        <Field
          control={control}
          name="capacity"
          label={t('quests.form.capacity')}
          inputMode="numeric"
          error={fieldError(errors.capacity?.message)}
        />
        <Field
          control={control}
          name="cancelDeadlineHours"
          label={t('quests.form.cancelDeadlineHours')}
          inputMode="numeric"
          error={fieldError(errors.cancelDeadlineHours?.message)}
        />
        <Field
          control={control}
          name="coordinatorContact"
          label={t('quests.form.contact')}
          error={fieldError(errors.coordinatorContact?.message)}
        />
      </Card>

      <Field control={control} name="bringItems" label={t('quests.form.bring')} multiline />
      <Field control={control} name="providedItems" label={t('quests.form.provided')} multiline />

      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">{t('quests.form.skills')}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {skills.data?.map((skill) => {
            const checked = selectedSkills.includes(skill.id);
            const name = (skill.name as Record<Language, string>)[lang];
            return (
              <Pressable
                key={skill.id}
                role="checkbox"
                aria-checked={checked}
                aria-label={name}
                onPress={() => {
                  // Текущее значение формы, а не из замыкания рендера: два быстрых нажатия
                  // подряд иначе затирали бы друг друга.
                  const current = getValues('skillIds');
                  setValue(
                    'skillIds',
                    current.includes(skill.id)
                      ? current.filter((id) => id !== skill.id)
                      : [...current, skill.id],
                  );
                }}
                style={{
                  minHeight: 48,
                  justifyContent: 'center',
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.pill,
                  borderWidth: 2,
                  borderColor: checked ? colors.primary : colors.border,
                  backgroundColor: checked ? colors.primaryMuted : colors.surface,
                }}
              >
                <AppText variant="bodyStrong" tone={checked ? 'primary' : 'default'}>
                  {checked ? '✓ ' : ''}
                  {name}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card>
        <AppText variant="heading">{t('quests.form.photo')}</AppText>
        {photoUrl.data ? (
          <Image
            source={{ uri: photoUrl.data }}
            accessibilityLabel={t('quests.photoBeforeLabel')}
            style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: radius.md }}
            contentFit="cover"
          />
        ) : null}
        <Button
          variant="secondary"
          title={t('quests.form.pickPhoto')}
          loading={uploading}
          onPress={() => void pickPhoto()}
        />
        {photoPath ? (
          <Button
            variant="ghost"
            title={t('quests.form.removePhoto')}
            onPress={() => setPhotoPath(null)}
          />
        ) : null}
      </Card>

      {serverError ? (
        <AppText tone="danger" accessibilityRole="alert">
          {serverError}
        </AppText>
      ) : null}

      {isDraftOrNew ? (
        <>
          <Button
            title={t('quests.form.publish')}
            loading={isSubmitting}
            onPress={() => void submit('published')}
          />
          <Button
            variant="secondary"
            title={t('quests.form.saveDraft')}
            disabled={isSubmitting}
            onPress={() => void submit('draft')}
          />
        </>
      ) : (
        <Button
          title={t('quests.form.save')}
          loading={isSubmitting}
          onPress={() => void submit('published')}
        />
      )}
      {quest ? (
        <ConfirmButton
          variant="danger"
          title={t('quests.form.cancelQuest')}
          confirmTitle={t('quests.form.confirmCancelQuest')}
          disabled={isSubmitting}
          onConfirm={() => void submit('cancelled')}
        />
      ) : null}
    </View>
  );
}

function Field({
  control,
  name,
  label,
  error,
  multiline,
  ...rest
}: {
  control: Control<QuestFormValues>;
  name: Exclude<FieldPath<QuestFormValues>, 'difficulty' | 'skillIds' | `skillIds.${number}`>;
  label: string;
  error?: string;
  multiline?: boolean;
} & Pick<TextInputProps, 'inputMode' | 'placeholder'>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <TextField
          label={label}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error}
          multiline={multiline}
          style={
            multiline ? { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 } : undefined
          }
          {...rest}
        />
      )}
    />
  );
}
