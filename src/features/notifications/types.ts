/**
 * Уведомления: типы, группы для настроек, текст в ленте и экран, куда ведёт нажатие.
 * Чистые функции без React Native — тестируются отдельно.
 *
 * Пуш-тексты рендерит сервер (private.push_templates). Заголовки в ленте — те же, это сверяет
 * тест notifications-test по SQL-миграции.
 */
import type { Href } from 'expo-router';

/** Типы, которые уходят пушем, — совпадают с private.push_types() в БД. */
export const PUSH_TYPES = [
  'new_quest',
  'quest_cancelled',
  'signup_confirmed',
  'waitlist_promoted',
  'quest_reminder',
  'shift_started',
  'hours_confirmed',
  'achievement_unlocked',
  'dispute_resolved',
  'dispute_opened',
  'join_approved',
  'join_rejected',
  'role_changed',
  'certificate_revoked',
] as const;
export type PushType = (typeof PUSH_TYPES)[number];

/** Группы переключателей в настройках: человеку проще думать категориями, чем типами. */
export const PUSH_CATEGORIES = {
  newQuests: ['new_quest'],
  signups: ['signup_confirmed', 'waitlist_promoted', 'quest_cancelled'],
  reminders: ['quest_reminder', 'shift_started'],
  results: ['hours_confirmed', 'achievement_unlocked', 'dispute_resolved'],
  organization: [
    'join_approved',
    'join_rejected',
    'role_changed',
    'certificate_revoked',
    'dispute_opened',
  ],
} as const satisfies Record<string, readonly PushType[]>;
export type PushCategory = keyof typeof PUSH_CATEGORIES;
export const PUSH_CATEGORY_KEYS = Object.keys(PUSH_CATEGORIES) as PushCategory[];

export function isCategoryMuted(category: PushCategory, muted: readonly string[]): boolean {
  return PUSH_CATEGORIES[category].every((type) => muted.includes(type));
}

/** Новый список отключённых типов после переключения категории. Порядок — как в PUSH_TYPES. */
export function toggleCategory(
  category: PushCategory,
  enabled: boolean,
  muted: readonly string[],
): PushType[] {
  const inCategory: readonly string[] = PUSH_CATEGORIES[category];
  const next = new Set(muted.filter((type) => !inCategory.includes(type)));
  if (!enabled) for (const type of inCategory) next.add(type);
  return PUSH_TYPES.filter((type) => next.has(type));
}

/**
 * Ключ текста: тип или тип с вариантом из payload (как private.push_key в БД, но через «_»,
 * потому что «:» — разделитель в ключах i18next).
 */
export function notificationKind(type: string, payload: Record<string, unknown>): string {
  const variant =
    type === 'quest_reminder'
      ? payload.kind
      : type === 'dispute_resolved'
        ? payload.status
        : type === 'role_changed'
          ? payload.role
          : undefined;
  return typeof variant === 'string' && variant ? `${type}_${variant}` : type;
}

export interface NotificationRow {
  id: string;
  type: string;
  org_id: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Данные пуша (data) или payload уведомления → экран приложения. */
export function notificationTarget(input: {
  type: string;
  orgId?: string | null;
  questId?: string | null;
  certificateId?: string | null;
}): Href | null {
  const { type, orgId, questId, certificateId } = input;
  if (type === 'dispute_opened' && orgId) {
    return { pathname: '/organizations/[orgId]/admin/disputes', params: { orgId } };
  }
  if (type === 'certificate_revoked') {
    return certificateId
      ? { pathname: '/certificates/[id]', params: { id: certificateId } }
      : '/certificates';
  }
  if (type === 'achievement_unlocked') return '/benefit';
  if (questId) return { pathname: '/quests/[questId]', params: { questId } };
  if ((type === 'join_approved' || type === 'role_changed') && orgId) {
    return { pathname: '/organizations/[orgId]', params: { orgId } };
  }
  if (type === 'join_rejected') return '/organizations';
  if (type === 'points_awarded') return '/benefit';
  return null;
}

export function targetOfRow(row: NotificationRow): Href | null {
  return notificationTarget({
    type: row.type,
    orgId: row.org_id,
    questId: text(row.payload.quest_id),
    certificateId: text(row.payload.certificate_id),
  });
}

/** Данные из нажатого пуша: сервер кладёт туда type, org_id, quest_id, certificate_id. */
export function targetOfPushData(data: unknown): {
  notificationId: string | null;
  href: Href | null;
} {
  if (typeof data !== 'object' || data === null) return { notificationId: null, href: null };
  const d = data as Record<string, unknown>;
  const type = text(d.type);
  return {
    notificationId: text(d.notification_id),
    href: type
      ? notificationTarget({
          type,
          orgId: text(d.org_id),
          questId: text(d.quest_id),
          certificateId: text(d.certificate_id),
        })
      : null,
  };
}

export interface NotificationDetails {
  /** Название квеста (если есть). */
  subject: string | null;
  minutes: number | null;
  points: number | null;
}

export function notificationDetails(row: Pick<NotificationRow, 'payload'>): NotificationDetails {
  const { payload } = row;
  return {
    subject: text(payload.title),
    minutes: typeof payload.minutes === 'number' ? payload.minutes : null,
    points: typeof payload.points === 'number' ? payload.points : null,
  };
}
