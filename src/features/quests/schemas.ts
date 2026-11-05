import { z } from 'zod';

import { parseWallTime, wallTimeToUtc } from './time';

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'extreme'] as const;

const number = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(',', '.'))
    .refine((v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= min && Number(v) <= max, {
      message,
    });

/** Список «через запятую или с новой строки» → массив без пустых, не больше 20 пунктов. */
export function splitItems(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

/** Поля формы квеста — строки, как в TextInput. Ограничения совпадают с БД. */
export const questFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, { message: 'titleLength' })
      .max(140, { message: 'titleLength' }),
    description: z.string().trim().max(4000, { message: 'descriptionLength' }),
    difficulty: z.enum(DIFFICULTIES),
    address: z
      .string()
      .trim()
      .min(3, { message: 'addressLength' })
      .max(300, { message: 'addressLength' }),
    lat: number(-90, 90, 'coordinates'),
    lng: number(-180, 180, 'coordinates'),
    date: z.string(),
    time: z.string(),
    durationHours: number(0.5, 24, 'duration'),
    capacity: number(1, 1000, 'capacity').refine((v) => Number.isInteger(Number(v)), {
      message: 'capacity',
    }),
    cancelDeadlineHours: number(0, 168, 'cancelDeadline'),
    radiusM: number(50, 5000, 'radius'),
    coordinatorContact: z.string().trim().max(200, { message: 'contactLength' }),
    bringItems: z.string(),
    providedItems: z.string(),
    skillIds: z.array(z.string()),
  })
  .refine((v) => parseWallTime(v.date, v.time) !== null, {
    message: 'dateTime',
    path: ['date'],
  });

export type QuestFormValues = z.input<typeof questFormSchema>;

export type QuestStatusChoice = 'draft' | 'published' | 'cancelled';

/** Данные формы → p_data для public.save_quest. Время вводится в поясе организации. */
export function toQuestPayload(
  values: QuestFormValues,
  timeZone: string,
  status: QuestStatusChoice,
) {
  const wall = parseWallTime(values.date, values.time);
  if (!wall) throw new Error('dateTime');
  const startsAt = wallTimeToUtc(wall, timeZone);
  const endsAt = new Date(
    startsAt.getTime() + Number(values.durationHours.replace(',', '.')) * 3600_000,
  );
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    difficulty: values.difficulty,
    status,
    address: values.address.trim(),
    lat: Number(values.lat.replace(',', '.')),
    lng: Number(values.lng.replace(',', '.')),
    radius_m: Number(values.radiusM),
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    capacity: Number(values.capacity),
    cancel_deadline_hours: Number(values.cancelDeadlineHours),
    coordinator_contact: values.coordinatorContact.trim(),
    bring_items: splitItems(values.bringItems),
    provided_items: splitItems(values.providedItems),
  };
}
