import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import en from '@/i18n/locales/en';
import kk from '@/i18n/locales/kk';
import ru from '@/i18n/locales/ru';

import {
  isCategoryMuted,
  notificationDetails,
  notificationKind,
  notificationTarget,
  PUSH_CATEGORIES,
  PUSH_TYPES,
  targetOfPushData,
  targetOfRow,
  toggleCategory,
} from '../types';

const migration = readFileSync(
  join(__dirname, '../../../../supabase/migrations/20261106000010_push.sql'),
  'utf8',
);

/** Строки private.push_templates из миграции: ключ, язык, заголовок. */
function sqlTemplates() {
  const rows = [...migration.matchAll(/\('([a-z_:]+)', '(kk|ru|en)', '((?:[^']|'')*)', '/g)];
  return rows.map(([, key = '', locale = '', title = '']) => ({
    key,
    locale,
    title: title.replace(/''/g, "'"),
  }));
}

describe('типы пушей', () => {
  it('список совпадает с private.push_types() в миграции', () => {
    const body =
      /create function private\.push_types\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/.exec(
        migration,
      )?.[1];
    const sqlTypes = [...(body ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(sqlTypes).toEqual([...PUSH_TYPES]);
  });

  it('каждый тип входит ровно в одну группу настроек', () => {
    const grouped = Object.values(PUSH_CATEGORIES).flat();
    expect([...grouped].sort()).toEqual([...PUSH_TYPES].sort());
  });

  it('заголовки в ленте совпадают с заголовками пушей на всех языках', () => {
    const locales = { ru, kk, en } as const;
    const templates = sqlTemplates();
    expect(templates.length).toBeGreaterThan(40);
    for (const { key, locale, title } of templates) {
      const kind = key.replace(':', '_') as keyof typeof ru.notifications.kinds;
      expect([
        locale,
        key,
        locales[locale as keyof typeof locales].notifications.kinds[kind],
      ]).toEqual([locale, key, title]);
    }
  });
});

describe('notificationKind', () => {
  it('вариант берётся из payload так же, как на сервере', () => {
    expect(notificationKind('quest_reminder', { kind: 'soon' })).toBe('quest_reminder_soon');
    expect(notificationKind('dispute_resolved', { status: 'rejected' })).toBe(
      'dispute_resolved_rejected',
    );
    expect(notificationKind('role_changed', { role: 'coordinator' })).toBe(
      'role_changed_coordinator',
    );
    expect(notificationKind('new_quest', { kind: 'soon' })).toBe('new_quest');
    expect(notificationKind('quest_reminder', {})).toBe('quest_reminder');
  });
});

describe('настройки по группам', () => {
  it('отключение группы добавляет все её типы, включение — убирает', () => {
    const off = toggleCategory('results', false, ['new_quest']);
    expect(off).toEqual([
      'new_quest',
      'hours_confirmed',
      'achievement_unlocked',
      'dispute_resolved',
    ]);
    expect(isCategoryMuted('results', off)).toBe(true);
    expect(toggleCategory('results', true, off)).toEqual(['new_quest']);
  });

  it('группа считается отключённой, только если отключены все её типы', () => {
    expect(isCategoryMuted('reminders', ['quest_reminder'])).toBe(false);
    expect(isCategoryMuted('reminders', ['quest_reminder', 'shift_started'])).toBe(true);
  });

  it('неизвестные типы из старых настроек отбрасываются', () => {
    expect(toggleCategory('newQuests', true, ['legacy_type', 'shift_started'])).toEqual([
      'shift_started',
    ]);
  });
});

describe('куда ведёт нажатие', () => {
  const quest = '9e000000-0000-4000-8000-000000000003';
  const org = '0e000000-0000-4000-8000-000000000001';

  it('квестовые уведомления — на карточку квеста', () => {
    expect(notificationTarget({ type: 'quest_reminder', questId: quest })).toEqual({
      pathname: '/quests/[questId]',
      params: { questId: quest },
    });
  });

  it('новый спор — админу в список споров организации', () => {
    expect(notificationTarget({ type: 'dispute_opened', orgId: org, questId: quest })).toEqual({
      pathname: '/organizations/[orgId]/admin/disputes',
      params: { orgId: org },
    });
  });

  it('организация, сертификаты и достижения', () => {
    expect(notificationTarget({ type: 'join_approved', orgId: org })).toEqual({
      pathname: '/organizations/[orgId]',
      params: { orgId: org },
    });
    expect(notificationTarget({ type: 'certificate_revoked', certificateId: 'c1' })).toEqual({
      pathname: '/certificates/[id]',
      params: { id: 'c1' },
    });
    expect(notificationTarget({ type: 'certificate_revoked' })).toBe('/certificates');
    expect(notificationTarget({ type: 'achievement_unlocked', questId: quest })).toBe('/benefit');
    expect(notificationTarget({ type: 'join_rejected' })).toBe('/organizations');
    expect(notificationTarget({ type: 'something_new' })).toBeNull();
  });

  it('данные пуша разбираются без доверия к форме', () => {
    expect(targetOfPushData(null)).toEqual({ notificationId: null, href: null });
    expect(targetOfPushData({ type: 42 })).toEqual({ notificationId: null, href: null });
    expect(
      targetOfPushData({ notification_id: 'n1', type: 'hours_confirmed', quest_id: quest }),
    ).toEqual({
      notificationId: 'n1',
      href: { pathname: '/quests/[questId]', params: { questId: quest } },
    });
  });

  it('строка ленты ведёт туда же, куда пуш', () => {
    expect(
      targetOfRow({
        id: 'n1',
        type: 'signup_confirmed',
        org_id: org,
        payload: { quest_id: quest, title: 'Берег' },
        read_at: null,
        created_at: '2026-11-06T10:00:00Z',
      }),
    ).toEqual({ pathname: '/quests/[questId]', params: { questId: quest } });
  });
});

describe('notificationDetails', () => {
  it('берёт только значения нужного типа', () => {
    expect(
      notificationDetails({ payload: { title: 'Берег', minutes: 210, points: 'много' } }),
    ).toEqual({
      subject: 'Берег',
      minutes: 210,
      points: null,
    });
    expect(notificationDetails({ payload: { title: '' } }).subject).toBeNull();
  });
});
