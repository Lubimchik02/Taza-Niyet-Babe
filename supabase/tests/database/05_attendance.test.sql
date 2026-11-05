-- Этап 5: учёт часов. Критерии готовности из задания:
--  * нельзя отметиться без записи, вне радиуса или по старому QR;
--  * часы, рассчитанные сервером, совпадают с ожидаемыми (округление, пояса, через полночь);
--  * любая правка часов видна в журнале с причиной;
--  * офлайн check-in синхронизируется без дублей.
begin;
create extension if not exists pgtap with schema extensions;
select plan(64);

create function pg_temp.login_as(p_user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Квест 3 «Берег Есентая: вторая волна»: координатор coord2, записаны vol1, vol2, vol7.
-- Переносим его на «сейчас»: начался 30 минут назад, закончится через 2,5 часа.
update public.quests
set starts_at = now() - interval '30 minutes', ends_at = now() + interval '150 minutes'
where id = '9e000000-0000-4000-8000-000000000003';
-- Квест 6 (экстрим, coord1, записан vol1) — тоже «сейчас», для проверки двух смен одновременно.
update public.quests
set starts_at = now() - interval '10 minutes', ends_at = now() + interval '3 hours'
where id = '9e000000-0000-4000-8000-000000000006';

select set_config('t.q3', '9e000000-0000-4000-8000-000000000003', true);
-- Точка квеста 3: 43.2187, 76.9286, радиус 300 м.

-- =========================== Старт смены ===========================
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.start_shift(current_setting('t.q3')::uuid) $$, 'P0001', 'not_allowed',
  'Волонтёр не начинает смену');
select throws_ok($$ select public.get_shift_qr(current_setting('t.q3')::uuid) $$, 'P0001', 'not_allowed',
  'Волонтёр не получает QR смены');

select pg_temp.login_as('c0000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.start_shift('9e000000-0000-4000-8000-000000000007') $$, 'P0001',
  'shift_too_early', 'Смену нельзя начать раньше чем за час до квеста');
select is((select status from public.start_shift(current_setting('t.q3')::uuid)),
  'in_progress'::public.quest_status, 'Координатор начинает смену');
select is((select status from public.start_shift(current_setting('t.q3')::uuid)),
  'in_progress'::public.quest_status, 'Повторный старт ничего не ломает');

select matches((select token from public.get_shift_qr(current_setting('t.q3')::uuid)),
  '^9e000000-0000-4000-8000-000000000003\.[0-9]+\.[0-9a-f]{32}$', 'QR: квест, окно и подпись HMAC');
select is((select count(distinct token)::int from public.get_shift_qr(current_setting('t.q3')::uuid, 120)), 120,
  'Пачка токенов для офлайна: каждый на своё 30-секундное окно');
select throws_ok($$ select public.get_shift_qr(current_setting('t.q3')::uuid, 1000) $$, 'P0001',
  'invalid_windows', 'Пачка ограничена 4 часами');

-- Токены готовим от имени владельца БД (секрет клиенту недоступен).
reset role;
select set_config('t.token', private.qr_token(current_setting('t.q3')::uuid, private.qr_window(now())), true);
select set_config('t.old_token', private.qr_token(current_setting('t.q3')::uuid, private.qr_window(now()) - 3), true);
select set_config('t.forged', current_setting('t.q3') || '.' || private.qr_window(now()) || '.' || repeat('a', 32), true);
select set_config('t.no_shift', '9e000000-0000-4000-8000-000000000004.' || private.qr_window(now()) || '.' || repeat('0', 32), true);
select set_config('t.offline_token', private.qr_token(current_setting('t.q3')::uuid, private.qr_window(now() - interval '20 minutes')), true);
select set_config('t.offline_out_token', private.qr_token(current_setting('t.q3')::uuid, private.qr_window(now() - interval '5 minutes')), true);
select set_config('t.offline_10_token', private.qr_token(current_setting('t.q3')::uuid, private.qr_window(now() - interval '10 minutes')), true);

select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select throws_ok($$ select count(*) from private.shift_secrets $$, '42501', null, 'Секрет подписи QR клиенту недоступен');

-- =========================== Check-in по QR ===========================
select is(
  (select check_in_method || '/' || status from public.check_in(current_setting('t.token'), 43.2188, 76.9287,
     'e0000000-0000-4000-8000-000000000001')),
  'qr/active', 'Записанный волонтёр на месте отмечается по QR');
select set_config('t.vol1_session', (select id::text from public.attendance_sessions
  where user_id = 'f0000000-0000-4000-8000-000000000001'
    and quest_id = current_setting('t.q3')::uuid), true);
select is((select id::text from public.check_in(current_setting('t.token'), 43.2188, 76.9287,
     'e0000000-0000-4000-8000-000000000001')), current_setting('t.vol1_session'),
  'Повтор того же события возвращает ту же смену');
select is((select id::text from public.check_in(current_setting('t.token'), 43.2188, 76.9287,
     'e0000000-0000-4000-8000-000000000002')), current_setting('t.vol1_session'),
  'Повторный скан с новым событием не создаёт вторую смену');
select is((select count(*)::int from public.attendance_sessions
           where user_id = 'f0000000-0000-4000-8000-000000000001'
    and quest_id = current_setting('t.q3')::uuid), 1, 'У волонтёра ровно одна смена');

select pg_temp.login_as('f0000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.check_in(current_setting('t.token'), 43.2287, 76.9286, gen_random_uuid()) $$,
  'P0001', 'too_far', 'В 1,1 км от места отметиться нельзя');
select throws_ok($$ select public.check_in(current_setting('t.token'), null, null, gen_random_uuid()) $$,
  'P0001', 'location_required', 'Без геолокации отметиться нельзя');
select throws_ok($$ select public.check_in(current_setting('t.old_token'), 43.2188, 76.9287, gen_random_uuid()) $$,
  'P0001', 'qr_expired', 'Старый QR (полторы минуты назад) не принимается');
select throws_ok($$ select public.check_in(current_setting('t.forged'), 43.2188, 76.9287, gen_random_uuid()) $$,
  'P0001', 'qr_invalid', 'Подделанная подпись не принимается');
select throws_ok($$ select public.check_in('hello', 43.2188, 76.9287, gen_random_uuid()) $$,
  'P0001', 'qr_invalid', 'Мусор вместо QR не принимается');
select throws_ok($$ select public.check_in(current_setting('t.no_shift'), 43.2188, 76.9287, gen_random_uuid()) $$,
  'P0001', 'shift_not_started', 'QR квеста, где смена не начата, не работает');
select lives_ok(
  $$ select public.check_in(current_setting('t.token'), 43.2187 + 0.0026, 76.9286, 'e0000000-0000-4000-8000-000000000007') $$,
  'В 290 м — внутри радиуса 300 м — отметиться можно');
select is((select status from public.check_out(current_setting('t.token'), 43.2188, 76.9287, gen_random_uuid())),
  'closed'::public.attendance_status, 'Уход по QR закрывает смену');

select pg_temp.login_as('f0000000-0000-4000-8000-000000000003');
select throws_ok($$ select public.check_in(current_setting('t.token'), 43.2188, 76.9287, gen_random_uuid()) $$,
  'P0001', 'not_signed_up', 'Незаписанный волонтёр не может отметиться');

-- Две смены одновременно: vol1 уже на квесте 3, квест 6 тоже идёт.
select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');
select lives_ok($$ select public.start_shift('9e000000-0000-4000-8000-000000000006') $$, 'Смена квеста 6 начата');
reset role;
select set_config('t.q6_token', private.qr_token('9e000000-0000-4000-8000-000000000006', private.qr_window(now())), true);
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.check_in(current_setting('t.q6_token'), 43.0506, 76.9853, gen_random_uuid()) $$,
  'P0001', 'active_elsewhere', 'Нельзя иметь два активных check-in одновременно');

select is((select check_out_method from public.check_out(current_setting('t.token'), 43.2188, 76.9287, gen_random_uuid())),
  'qr'::public.attendance_method, 'Волонтёр отмечает уход по QR');
select throws_ok($$ select public.check_out(current_setting('t.token'), 43.2188, 76.9287, gen_random_uuid()) $$,
  'P0001', 'not_checked_in', 'Нельзя уйти, не придя');

-- =========================== Офлайн ===========================
-- vol2 отметился 20 минут назад без сети: время устройства + QR того окна.
select pg_temp.login_as('f0000000-0000-4000-8000-000000000002');
select is(
  (select offline::text || '/' || (check_in_at = now() - interval '20 minutes')::text
   from public.check_in(current_setting('t.offline_token'), 43.2188, 76.9287,
     'e0000000-0000-4000-8000-000000000020', now() - interval '20 minutes')),
  'true/true', 'Офлайн check-in сохраняет время устройства');
select lives_ok(
  $$ select public.check_in(current_setting('t.offline_token'), 43.2188, 76.9287,
       'e0000000-0000-4000-8000-000000000020', now() - interval '20 minutes') $$,
  'Повторная синхронизация того же события проходит');
select is((select count(*)::int from public.attendance_sessions where user_id = 'f0000000-0000-4000-8000-000000000002'
    and quest_id = current_setting('t.q3')::uuid),
  1, 'Повторная синхронизация не создаёт дубль');
select throws_ok(
  $$ select public.check_in(current_setting('t.offline_token'), 43.2188, 76.9287, gen_random_uuid(),
       now() - interval '25 hours') $$,
  'P0001', 'offline_too_old', 'Офлайн-отметка старше суток не принимается');
select throws_ok(
  $$ select public.check_in(current_setting('t.offline_token'), 43.2188, 76.9287, gen_random_uuid(),
       now() + interval '10 minutes') $$,
  'P0001', 'invalid_time', 'Время устройства из будущего не принимается');
select throws_ok(
  $$ select public.check_in(current_setting('t.token'), 43.2188, 76.9287, gen_random_uuid(),
       now() - interval '20 minutes') $$,
  'P0001', 'qr_expired', 'QR должен соответствовать заявленному времени устройства');
select is(
  (select status from public.check_out(current_setting('t.offline_out_token'), 43.2188, 76.9287,
     'e0000000-0000-4000-8000-000000000021', now() - interval '5 minutes')),
  'closed'::public.attendance_status, 'Офлайн-уход синхронизируется');
select is(
  (select count(*)::int from public.check_in(current_setting('t.offline_10_token'), 43.2188, 76.9287,
     gen_random_uuid(), now() - interval '10 minutes')
   where id = (select id from public.attendance_sessions where user_id = 'f0000000-0000-4000-8000-000000000002'
    and quest_id = current_setting('t.q3')::uuid)),
  1, 'Отметка внутри уже учтённой смены не создаёт пересекающуюся (минуты не удваиваются)');

-- =========================== Ручная отметка координатора ===========================
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.manual_check_in(current_setting('t.q3')::uuid, 'f0000000-0000-4000-8000-000000000010') $$,
  'P0001', 'not_allowed', 'Волонтёр не отмечает других вручную');

select pg_temp.login_as('c0000000-0000-4000-8000-000000000002');
reset role;
insert into auth.users (id, email) values ('b0000000-0000-4000-8000-000000000001', 'outsider@other.test');
select pg_temp.login_as('c0000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.manual_check_in(current_setting('t.q3')::uuid, 'b0000000-0000-4000-8000-000000000001') $$,
  'P0001', 'not_member', 'Отметить можно только участника организации');
-- vol10 отменил запись и пришёл без телефона — координатор отмечает вручную.
select is(
  (select check_in_method || '/' || (recorded_by = 'c0000000-0000-4000-8000-000000000002')::text
   from public.manual_check_in(current_setting('t.q3')::uuid, 'f0000000-0000-4000-8000-000000000010')),
  'manual/true', 'Ручная отметка помечена «вручную» и автором');
reset role;
select is((select status from public.quest_signups where quest_id = current_setting('t.q3')::uuid
           and user_id = 'f0000000-0000-4000-8000-000000000010'), 'signed_up'::public.signup_status,
  'Пришедший без записи добавлен в участники');

-- Конфликт офлайн-данных: у vol10 есть ручная отметка координатора, его офлайн-QR не создаёт вторую.
select pg_temp.login_as('f0000000-0000-4000-8000-000000000010');
select lives_ok(
  $$ select public.check_in(current_setting('t.offline_10_token'), 43.2188, 76.9287, gen_random_uuid(),
       now() - interval '10 minutes') $$,
  'Офлайн-событие волонтёра принято без ошибки');
select is((select count(*)::int || ':' || min(check_in_method::text) from public.attendance_sessions
           where user_id = 'f0000000-0000-4000-8000-000000000010'), '1:manual',
  'Конфликт решён в пользу данных координатора');

-- =========================== Корректировки ===========================
select pg_temp.login_as('c0000000-0000-4000-8000-000000000002');
select set_config('t.vol2_session', (select id::text from public.attendance_sessions
  where user_id = 'f0000000-0000-4000-8000-000000000002'
    and quest_id = current_setting('t.q3')::uuid), true);
select throws_ok(
  $$ select public.adjust_session(current_setting('t.vol2_session')::uuid, now() - interval '55 minutes',
       now() - interval '15 minutes', '') $$,
  'P0001', 'reason_required', 'Правка времени без причины запрещена');
select throws_ok(
  $$ select public.adjust_session(current_setting('t.vol2_session')::uuid, now(), now() - interval '1 hour',
       'Ошибка') $$,
  'P0001', 'invalid_time', 'Выход раньше входа — нельзя');
select lives_ok(
  $$ select public.adjust_session(current_setting('t.vol2_session')::uuid, now() - interval '55 minutes',
       now() - interval '15 minutes', 'Пришла раньше, QR ещё не был включён') $$,
  'Координатор правит время с причиной');
reset role;
select is((select count(*)::int || ':' || min(reason) from public.adjustments
           where session_id = current_setting('t.vol2_session')::uuid),
  '2:Пришла раньше, QR ещё не был включён', 'Каждое изменённое поле — в журнале с причиной');
select ok(exists (select 1 from public.audit_log where entity = 'attendance_sessions' and action = 'update'
                  and entity_id = current_setting('t.vol2_session')::uuid
                  and actor_id = 'c0000000-0000-4000-8000-000000000002'),
  'Правка видна в журнале аудита: кто, старое и новое значение');

-- =========================== Расчёт часов ===========================
select is(
  array[private.round_up_15(0), private.round_up_15(0.01), private.round_up_15(15), private.round_up_15(15.01),
        private.round_up_15(130), private.round_up_15(179.99)],
  array[0, 15, 15, 30, 135, 180], 'Округление вверх до 15 минут — в пользу волонтёра');

-- Вторая смена vol2 через полночь: 23:40–00:30 (50 мин). Первая после правки — 40 мин.
-- Итого 90 минут; округлять нужно сумму, а не каждую смену (иначе было бы 45 + 60 = 105).
insert into public.attendance_sessions (quest_id, user_id, status, check_in_at, check_out_at,
                                        check_in_method, check_out_method)
values (current_setting('t.q3')::uuid, 'f0000000-0000-4000-8000-000000000002', 'closed',
        '2026-11-04 23:40:00+00', '2026-11-05 00:30:00+00', 'manual', 'manual');

select pg_temp.login_as('c0000000-0000-4000-8000-000000000002');
set local timezone = 'Asia/Almaty';
select is((select rounded_minutes from public.shift_summary(current_setting('t.q3')::uuid)
           where user_id = 'f0000000-0000-4000-8000-000000000002'), 90,
  'Смена через полночь и сумма смен: 40 + 50 = 90 минут');
set local timezone = 'America/Los_Angeles';
select is((select rounded_minutes from public.shift_summary(current_setting('t.q3')::uuid)
           where user_id = 'f0000000-0000-4000-8000-000000000002'), 90,
  'Часовой пояс сессии не влияет на расчёт');
reset timezone;
select is((select offline from public.shift_summary(current_setting('t.q3')::uuid)
           where user_id = 'f0000000-0000-4000-8000-000000000002'), true,
  'Таблица смены помечает офлайн-отметки');

-- =========================== Завершение и подтверждение ===========================
select throws_ok($$ select public.confirm_hours(current_setting('t.q3')::uuid,
                    '[{"user_id":"f0000000-0000-4000-8000-000000000002","rating_quality":5,"rating_activity":5,"rating_teamwork":5}]') $$,
  'P0001', 'shift_not_finished', 'Подтверждать часы можно после завершения смены');
select is(public.finish_shift(current_setting('t.q3')::uuid), 1, '«Завершить задание» отмечает оставшихся');
reset role;
select is((select count(*)::int from public.attendance_sessions
           where quest_id = current_setting('t.q3')::uuid and check_out_at is null), 0, 'Активных смен не осталось');

select pg_temp.login_as('f0000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.check_in(current_setting('t.token'), 43.2188, 76.9287, gen_random_uuid()) $$,
  'P0001', 'shift_not_active', 'После завершения смены отметиться нельзя');

select pg_temp.login_as('c0000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.confirm_hours(current_setting('t.q3')::uuid,
                    '[{"user_id":"f0000000-0000-4000-8000-000000000001","minutes":30,"rating_quality":4,"rating_activity":4,"rating_teamwork":4}]') $$,
  'P0001', 'reason_required', 'Изменить рассчитанные часы без причины нельзя');
select throws_ok($$ select public.confirm_hours(current_setting('t.q3')::uuid,
                    '[{"user_id":"f0000000-0000-4000-8000-000000000003","rating_quality":4,"rating_activity":4,"rating_teamwork":4}]') $$,
  'P0001', 'not_checked_in', 'Нельзя подтвердить часы тому, кто не приходил');
select is(public.confirm_hours(current_setting('t.q3')::uuid, '[
  {"user_id":"f0000000-0000-4000-8000-000000000002","rating_quality":5,"rating_activity":4,"rating_teamwork":5,"comment":"Отлично!"},
  {"user_id":"f0000000-0000-4000-8000-000000000001","minutes":30,"reason":"Помогал грузить мешки после смены",
   "rating_quality":4,"rating_activity":4,"rating_teamwork":4}
]'), 2, 'Координатор подтверждает часы и ставит оценки');
select throws_ok($$ select public.confirm_hours(current_setting('t.q3')::uuid,
                    '[{"user_id":"f0000000-0000-4000-8000-000000000002","rating_quality":5,"rating_activity":5,"rating_teamwork":5}]') $$,
  'P0001', 'already_confirmed', 'Подтверждённые часы нельзя подтвердить повторно');
select throws_ok(
  $$ select public.adjust_session(current_setting('t.vol2_session')::uuid, now() - interval '3 hours', now(), 'Хочу больше') $$,
  'P0001', 'already_confirmed', 'После подтверждения время не правится (только через спор)');

-- =========================== Прозрачность для волонтёра ===========================
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select is(
  (select (confirmation ->> 'confirmed_minutes') || ' / ' || (adjustments -> 0 ->> 'reason')
   from public.my_quest_attendance(current_setting('t.q3')::uuid)),
  '30 / Помогал грузить мешки после смены', 'Волонтёр видит подтверждённые часы и причину правки');
select throws_ok($$ select * from public.shift_summary(current_setting('t.q3')::uuid) $$, 'P0001', 'not_allowed',
  'Таблица смены волонтёру недоступна');

-- =========================== Автозакрытие ===========================
-- Квест 5: закончился 3 часа назад, vol9 забыли отметить уходящим.
reset role;
update public.quests set starts_at = now() - interval '6 hours', ends_at = now() - interval '3 hours',
  status = 'in_progress' where id = '9e000000-0000-4000-8000-000000000005';
insert into public.attendance_sessions (quest_id, user_id, check_in_at, check_in_method)
values ('9e000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000009',
        now() - interval '5 hours', 'qr');
select ok(private.auto_close_sessions() >= 1, 'Автозакрытие срабатывает');
select is(
  (select check_out_method || '/' || status || '/' || (check_out_at = now() - interval '3 hours')::text
   from public.attendance_sessions where user_id = 'f0000000-0000-4000-8000-000000000009'),
  'auto/needs_confirmation/true', 'Смена закрыта по плановому окончанию и требует подтверждения');
select is((select status from public.quests where id = '9e000000-0000-4000-8000-000000000005'),
  'completed'::public.quest_status, 'Просроченный квест завершён');
select is((select count(*)::int from cron.job where jobname = 'auto-close-sessions'), 1,
  'Автозакрытие запускается по расписанию');

select * from finish();
rollback;
