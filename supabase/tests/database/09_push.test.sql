-- Этап 9: push-уведомления — токены устройств, настройки, напоминания, тексты и отправка.
-- Сеть в тестах не участвует: запросы pg_net остаются в очереди транзакции (откатываются),
-- а ответы Expo подставляются вручную в net._http_response.
begin;
create extension if not exists pgtap with schema extensions;
select plan(54);

create function pg_temp.login_as(p_user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function pg_temp.affected(p_sql text) returns integer language plpgsql as $$
declare
  v_count integer;
begin
  execute p_sql;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- vol1 Арман, vol2 Алия, vol6 Камила, vol8, vol9 — волонтёры одной организации.
select set_config('t.vol1', 'f0000000-0000-4000-8000-000000000001', true);
select set_config('t.vol2', 'f0000000-0000-4000-8000-000000000002', true);
select set_config('t.vol6', 'f0000000-0000-4000-8000-000000000006', true);
select set_config('t.vol8', 'f0000000-0000-4000-8000-000000000008', true);
select set_config('t.vol9', 'f0000000-0000-4000-8000-000000000009', true);
-- Квест 4 заполнен (3 из 3), квест 6 — vol1 записан давно, квест 7 — без записей.
select set_config('t.q4', '9e000000-0000-4000-8000-000000000004', true);
select set_config('t.q6', '9e000000-0000-4000-8000-000000000006', true);
select set_config('t.q7', '9e000000-0000-4000-8000-000000000007', true);

-- Чтобы тест не зависел от cron и данных seed: никаких токенов и ожидающих пушей до начала.
delete from public.push_tokens;
update public.notifications set push_status = 'skipped' where push_status in ('pending', 'sending');

-- =========================== Токены устройств ===========================
select pg_temp.login_as(current_setting('t.vol1')::uuid);
select lives_ok($$ select public.register_push_token('ExponentPushToken[vol1-phone-0001]', 'android') $$,
  'Волонтёр регистрирует токен своего телефона');
select lives_ok($$ select public.register_push_token('ExponentPushToken[vol1-phone-0001]', 'android') $$,
  'Повторная регистрация того же токена не ошибка');
select is((select count(*)::int from public.push_tokens), 1, 'Свой токен виден, дубля нет');
select throws_ok($$ select public.register_push_token('not-a-token', 'android') $$,
  'P0001', 'invalid_push_token', 'Строка не в формате Expo — отказ');
select throws_ok($$ select public.register_push_token('ExponentPushToken[vol1-phone-0002]', 'web') $$,
  'P0001', 'invalid_push_token', 'Неизвестная платформа — отказ');
select throws_ok(
  $$ insert into public.push_tokens (token, user_id, platform)
     values ('ExponentPushToken[forged-token-01]', current_setting('t.vol2')::uuid, 'ios') $$,
  '42501', null, 'Записать токен напрямую (в том числе чужой) нельзя');
select throws_ok($$ update public.push_tokens set platform = 'ios' $$,
  '42501', null, 'Изменить токен напрямую нельзя');

select pg_temp.login_as(current_setting('t.vol2')::uuid);
select is((select count(*)::int from public.push_tokens), 0, 'Чужие токены не видны');
select lives_ok($$ select public.register_push_token('ExponentPushToken[vol1-phone-0001]', 'android') $$,
  'На том же телефоне вошёл другой человек');
select is((select count(*)::int from public.push_tokens where user_id = current_setting('t.vol2')::uuid), 1,
  'Токен переходит к новому владельцу');
select pg_temp.login_as(current_setting('t.vol1')::uuid);
select is((select count(*)::int from public.push_tokens), 0, 'Прежний владелец больше не получает пуши');
select public.unregister_push_token('ExponentPushToken[vol1-phone-0001]');
reset role;
select is((select count(*)::int from public.push_tokens where token = 'ExponentPushToken[vol1-phone-0001]'), 1,
  'Удалить чужой токен нельзя');
select pg_temp.login_as(current_setting('t.vol2')::uuid);
select public.unregister_push_token('ExponentPushToken[vol1-phone-0001]');
reset role;
select is((select count(*)::int from public.push_tokens), 0, 'Выход из аккаунта удаляет свой токен');

select pg_temp.login_as(current_setting('t.vol1')::uuid);
select public.register_push_token('ExponentPushToken[vol1-device-' || lpad(g::text, 4, '0') || ']', 'ios')
from generate_series(1, 12) g;
select is((select count(*)::int from public.push_tokens), 10, 'Не больше 10 устройств на человека');
select ok(exists (select 1 from public.push_tokens where token = 'ExponentPushToken[vol1-device-0012]'),
  'Самое новое устройство остаётся');
reset role;
delete from public.push_tokens;

-- =========================== Настройки ===========================
select pg_temp.login_as(current_setting('t.vol1')::uuid);
select lives_ok(
  $$ insert into public.notification_preferences (user_id, muted_types)
     values (current_setting('t.vol1')::uuid, '{new_quest}')
     on conflict (user_id) do update set muted_types = excluded.muted_types $$,
  'Волонтёр отключает пуши о новых квестах');
select lives_ok(
  $$ insert into public.notification_preferences (user_id, muted_types)
     values (current_setting('t.vol1')::uuid, '{new_quest,quest_reminder}')
     on conflict (user_id) do update set user_id = excluded.user_id, muted_types = excluded.muted_types $$,
  'Повторное сохранение (upsert из приложения) обновляет настройки');
select throws_ok(
  $$ update public.notification_preferences set user_id = current_setting('t.vol2')::uuid $$,
  '42501', null, 'Передать свои настройки другому нельзя');
select throws_ok(
  $$ update public.notification_preferences set muted_types = '{no_such_type}' $$,
  '23514', null, 'Неизвестный тип отключить нельзя');
select throws_ok(
  $$ insert into public.notification_preferences (user_id, muted_types) values (current_setting('t.vol2')::uuid, '{}') $$,
  '42501', null, 'Настройки другого человека создать нельзя');
select pg_temp.login_as(current_setting('t.vol2')::uuid);
select is((select count(*)::int from public.notification_preferences), 0, 'Чужие настройки не видны');
select throws_ok($$ update public.notifications set push_status = 'sent' $$,
  '42501', null, 'Статус доставки менять нельзя');
reset role;

-- =========================== «Запись подтверждена» ===========================
select pg_temp.login_as(current_setting('t.vol8')::uuid);
select public.signup_for_quest(current_setting('t.q7')::uuid);
select public.signup_for_quest(current_setting('t.q7')::uuid);
reset role;
select is((select count(*)::int from public.notifications
           where user_id = current_setting('t.vol8')::uuid and type = 'signup_confirmed'
             and payload ->> 'quest_id' = current_setting('t.q7')), 1,
  'Запись даёт одно уведомление, повторное нажатие — ни одного');
select pg_temp.login_as(current_setting('t.vol8')::uuid);
select public.cancel_signup(current_setting('t.q7')::uuid);
select public.signup_for_quest(current_setting('t.q7')::uuid);
select pg_temp.login_as(current_setting('t.vol9')::uuid);
select is((select status from public.signup_for_quest(current_setting('t.q4')::uuid)),
  'waitlisted'::public.signup_status, 'На заполненный квест — в лист ожидания');
reset role;
select is((select count(*)::int from public.notifications
           where user_id = current_setting('t.vol8')::uuid and type = 'signup_confirmed'), 2,
  'Повторная запись после отмены — снова уведомление');
select is((select count(*)::int from public.notifications
           where user_id = current_setting('t.vol9')::uuid and type = 'signup_confirmed'), 0,
  'Лист ожидания — не «запись подтверждена»');

-- =========================== Напоминания ===========================
-- Квест 6: vol1 записан давно, начало через 20 ч → «за сутки».
-- Квест 7: vol8 записался только что, начало через 20 ч → «за сутки» не нужно.
update public.quests set starts_at = now() + interval '20 hours', ends_at = now() + interval '23 hours'
where id in (current_setting('t.q6')::uuid, current_setting('t.q7')::uuid);
update public.quest_signups set status_changed_at = now() - interval '3 days'
where quest_id = current_setting('t.q6')::uuid and user_id = current_setting('t.vol1')::uuid;
select private.queue_reminders();
select is((select count(*)::int from public.notifications
           where type = 'quest_reminder' and payload ->> 'kind' = 'day'
             and user_id = current_setting('t.vol1')::uuid and payload ->> 'quest_id' = current_setting('t.q6')), 1,
  'Напоминание за сутки тому, кто записался заранее');
select is((select count(*)::int from public.notifications
           where type = 'quest_reminder' and user_id = current_setting('t.vol8')::uuid), 0,
  'Записавшемуся меньше чем за сутки напоминание «за сутки» не приходит');
select private.queue_reminders();
select is((select count(*)::int from public.notifications
           where type = 'quest_reminder' and user_id = current_setting('t.vol1')::uuid
             and payload ->> 'quest_id' = current_setting('t.q6')), 1,
  'Повторный запуск не дублирует напоминание');

update public.quests set starts_at = now() + interval '90 minutes', ends_at = now() + interval '5 hours'
where id in (current_setting('t.q6')::uuid, current_setting('t.q7')::uuid);
select private.queue_reminders();
select private.queue_reminders();
select is((select count(*)::int from public.notifications
           where type = 'quest_reminder' and payload ->> 'kind' = 'soon'
             and (payload ->> 'quest_id', user_id::text) in
                 ((current_setting('t.q6'), current_setting('t.vol1')),
                  (current_setting('t.q7'), current_setting('t.vol8')))), 2,
  'За 2 часа напоминание получает каждый записанный — по одному');

update public.quests set starts_at = now() - interval '10 minutes'
where id = current_setting('t.q7')::uuid;
update public.quest_signups set status = 'cancelled'
where quest_id = current_setting('t.q6')::uuid and user_id = current_setting('t.vol1')::uuid;
select is(private.queue_reminders(), 0, 'Начавшийся квест и отменённая запись — без напоминаний');

-- =========================== Тексты ===========================
select is(private.format_duration(210, 'ru'), '3 ч 30 мин', 'Длительность по-русски — как в приложении');
select is(private.format_duration(45, 'en'), '45 min', 'Только минуты');
select is(private.format_duration(120, 'kk'), '2 сағ', 'Только часы, по-казахски');
select is(
  (select count(*)::int from unnest(private.push_types()) t(type), unnest(array['kk', 'ru', 'en']) l(locale)
   where not exists (select 1 from private.push_templates p
                     where (p.key = t.type or p.key like t.type || ':%') and p.locale = l.locale)),
  0, 'У каждого типа пуша есть текст на трёх языках');
select is(
  (select count(*)::int from (select key from private.push_templates group by key having count(*) <> 3) k),
  0, 'У каждого варианта текста ровно три языка');

insert into public.notifications (id, user_id, org_id, type, payload)
select 'b1000000-0000-4000-8000-000000000001', current_setting('t.vol6')::uuid, c.org_id, 'hours_confirmed',
       jsonb_build_object('quest_id', c.quest_id, 'title', 'Берег', 'minutes', 210)
from public.hour_confirmations c where c.user_id = current_setting('t.vol6')::uuid limit 1;
update public.profiles set locale = null where id = current_setting('t.vol6')::uuid;
select is((select title || ' | ' || body from public.notifications n, private.render_push(n)
           where n.id = 'b1000000-0000-4000-8000-000000000001'),
  'Часы подтверждены | Берег · Часы: 3 ч 30 мин · Баллы: +105',
  'Язык не выбран — русский; баллы берутся из начислений за квест');
update public.profiles set locale = 'en' where id = current_setting('t.vol6')::uuid;
select is((select body from public.notifications n, private.render_push(n)
           where n.id = 'b1000000-0000-4000-8000-000000000001'),
  'Берег · Hours: 3 h 30 min · Points: +105', 'Текст на языке получателя');
select is((select data ->> 'quest_id' from public.notifications n, private.render_push(n)
           where n.id = 'b1000000-0000-4000-8000-000000000001'),
  (select quest_id::text from public.hour_confirmations where user_id = current_setting('t.vol6')::uuid limit 1),
  'В данных пуша — квест, на который ведёт нажатие');

-- =========================== Отправка ===========================
update public.notifications set push_status = 'skipped' where push_status = 'pending';
insert into public.push_tokens (token, user_id, platform) values
  ('ExponentPushToken[vol6-phone-0001]', current_setting('t.vol6')::uuid, 'android'),
  ('ExponentPushToken[vol6-tablet-001]', current_setting('t.vol6')::uuid, 'ios'),
  ('ExponentPushToken[vol1-phone-0001]', current_setting('t.vol1')::uuid, 'android');
update public.notifications set push_status = 'pending' where id = 'b1000000-0000-4000-8000-000000000001';
insert into public.notifications (id, user_id, org_id, type, payload, created_at) values
  -- vol1 отключил new_quest
  ('b1000000-0000-4000-8000-000000000002', current_setting('t.vol1')::uuid, null, 'new_quest', '{}', now()),
  -- у vol2 нет устройств
  ('b1000000-0000-4000-8000-000000000003', current_setting('t.vol2')::uuid, null, 'join_approved', '{}', now()),
  -- баллы уходят внутри hours_confirmed
  ('b1000000-0000-4000-8000-000000000004', current_setting('t.vol6')::uuid, null, 'points_awarded', '{}', now()),
  -- устарело
  ('b1000000-0000-4000-8000-000000000005', current_setting('t.vol6')::uuid, null, 'join_approved', '{}',
   now() - interval '7 hours'),
  -- обычное
  ('b1000000-0000-4000-8000-000000000006', current_setting('t.vol1')::uuid, null, 'join_approved', '{}', now());

select is(private.dispatch_push(), 2, 'Отправлены два уведомления');
select is(
  (select string_agg(right(id::text, 1) || ':' || push_status, ' ' order by id) from public.notifications
   where id::text like 'b1000000-%'),
  '1:sending 2:skipped 3:skipped 4:skipped 5:skipped 6:sending',
  'Отключённые, без устройств, без текста и устаревшие — пропущены');
select is((select array_length(tokens, 1) from private.push_requests where kind = 'send'), 3,
  'Одно сообщение на каждое устройство получателя, все в одном запросе');
select is(private.dispatch_push(), 0, 'Уже отправленное повторно не уходит');

-- Ответ Expo: первое устройство Камилы принято, второе удалено из Apple, у vol1 — ок.
insert into net._http_response (id, status_code, content, created)
select request_id, 200,
  jsonb_build_object('data', jsonb_build_array(
    case tokens[1] when 'ExponentPushToken[vol6-tablet-001]'
      then '{"status":"error","details":{"error":"DeviceNotRegistered"}}'::jsonb
      else jsonb_build_object('status', 'ok', 'id', 'ticket-1') end,
    case tokens[2] when 'ExponentPushToken[vol6-tablet-001]'
      then '{"status":"error","details":{"error":"DeviceNotRegistered"}}'::jsonb
      else jsonb_build_object('status', 'ok', 'id', 'ticket-2') end,
    case tokens[3] when 'ExponentPushToken[vol6-tablet-001]'
      then '{"status":"error","details":{"error":"DeviceNotRegistered"}}'::jsonb
      else jsonb_build_object('status', 'ok', 'id', 'ticket-3') end))::text,
  now()
from private.push_requests where kind = 'send';
select is(private.process_push_responses(), 1, 'Ответ разобран');
select is(
  (select string_agg(push_status, ' ' order by id) from public.notifications
   where id in ('b1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000006')),
  'sent sent', 'Уведомления доставлены в Expo');
select ok(not exists (select 1 from public.push_tokens where token = 'ExponentPushToken[vol6-tablet-001]'),
  'Устройство, удалившее приложение, забыто');
select is((select count(*)::int from private.push_tickets), 2, 'Билеты сохранены для квитанций');

-- Сбой сети: повтор, после трёх попыток — failed.
insert into public.notifications (id, user_id, org_id, type, payload) values
  ('b1000000-0000-4000-8000-000000000007', current_setting('t.vol1')::uuid, null, 'join_approved', '{}');
select private.dispatch_push();
insert into net._http_response (id, status_code, content, created)
select request_id, 503, 'unavailable', now() from private.push_requests where processed_at is null;
select private.process_push_responses();
select is((select push_status || ':' || push_attempts from public.notifications
           where id = 'b1000000-0000-4000-8000-000000000007'), 'pending:1', 'Ошибка сервера — повторная попытка');
update public.notifications set push_attempts = 3 where id = 'b1000000-0000-4000-8000-000000000007';
select private.dispatch_push();
insert into net._http_response (id, status_code, content, created, timed_out)
select request_id, null, null, now(), true from private.push_requests where processed_at is null;
select private.process_push_responses();
select is((select push_status from public.notifications where id = 'b1000000-0000-4000-8000-000000000007'),
  'failed', 'После нескольких неудачных попыток — отказ без бесконечных повторов');

-- Квитанции через 15 минут: устройство удалило приложение — токен удаляется.
update private.push_tickets set created_at = now() - interval '20 minutes';
select is(private.request_push_receipts(), 2, 'Запрошены квитанции по старым билетам');
insert into net._http_response (id, status_code, content, created)
select r.request_id, 200,
  jsonb_build_object('data', (select jsonb_object_agg(t.ticket_id,
    case when t.token = 'ExponentPushToken[vol1-phone-0001]'
      then '{"status":"error","details":{"error":"DeviceNotRegistered"}}'::jsonb
      else '{"status":"ok"}'::jsonb end) from private.push_tickets t))::text,
  now()
from private.push_requests r where r.kind = 'receipts';
select private.process_push_responses();
select is((select count(*)::int from public.push_tokens), 1,
  'По квитанции DeviceNotRegistered токен vol1 удалён, телефон Камилы на месте');
select is(private.request_push_receipts(), 0, 'Проверенные билеты повторно не запрашиваются');

-- =========================== Расписание ===========================
select is((select schedule from cron.job where jobname = 'push-notifications'), '15 seconds',
  'Отправка запускается каждые 15 секунд');
select lives_ok($$ select private.push_tick() $$, 'Полный цикл отправки выполняется без ошибок');

select * from finish();
rollback;
