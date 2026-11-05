-- Права ролей внутри организации: волонтёр, координатор, администратор.
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

create function pg_temp.login_as(p_user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function pg_temp.affected(p_sql text) returns integer language plpgsql as $$
declare
  n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- id подтверждения vol1 (берём от имени владельца БД, до входа под пользователем).
select set_config('test.vol1_confirmation',
  (select id::text from public.hour_confirmations
   where user_id = 'f0000000-0000-4000-8000-000000000001'
     and quest_id = '9e000000-0000-4000-8000-000000000001'),
  true);

-- =========================== Волонтёр (vol1) ===========================
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');

select is((select count(*)::int from public.quests), 7, 'Волонтёр видит опубликованные квесты');
select is((select count(*)::int from public.quests where status = 'draft'), 0, 'Волонтёр не видит черновики');
select is((select count(*)::int from public.tasks), 0, 'Волонтёр не видит задачи «сверху»');
select is((select count(*)::int from public.quest_skills where quest_id = '9e000000-0000-4000-8000-000000000008'), 0,
  'Навыки черновика тоже скрыты');

select is((select count(*)::int from public.attendance_sessions), 2, 'Волонтёр видит свои смены');
select is((select count(*)::int from public.attendance_sessions where user_id <> 'f0000000-0000-4000-8000-000000000001'), 0,
  'Волонтёр не видит чужие смены');
select is((select count(*)::int from public.hour_confirmations where user_id <> 'f0000000-0000-4000-8000-000000000001'), 0,
  'Волонтёр не видит чужие подтверждения');
select is((select count(*)::int from public.quest_signups where user_id <> 'f0000000-0000-4000-8000-000000000001'), 0,
  'Волонтёр не видит чужие записи');
select ok((select sum(points) from public.points_ledger) > 0, 'Волонтёр видит свои баллы');
select is((select count(*)::int from public.points_ledger where user_id <> 'f0000000-0000-4000-8000-000000000001'), 0,
  'Волонтёр не видит чужие баллы');
select is((select count(*)::int from public.audit_log), 0, 'Волонтёр не читает аудит');
select is((select count(*)::int from public.profiles where id = 'f0000000-0000-4000-8000-000000000002'), 1,
  'Волонтёр видит профиль коллеги по организации');

select throws_ok(
  $$ insert into public.quests (org_id, title, difficulty, address, lat, lng, starts_at, ends_at, capacity)
     values ('0e000000-0000-4000-8000-000000000001', 'Мой квест', 'easy', 'Алматы', 43.2, 76.9,
             now() + interval '1 day', now() + interval '1 day 2 hours', 5) $$,
  '42501', null, 'Волонтёр не создаёт квесты');
select throws_ok(
  $$ insert into public.attendance_sessions (quest_id, user_id, check_in_at, check_in_method)
     values ('9e000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001', now(), 'manual') $$,
  '42501', null, 'Волонтёр не может отметить себя в обход сервера');
select throws_ok(
  $$ update public.hour_confirmations set confirmed_minutes = 1440 $$,
  '42501', null, 'Волонтёр не может накрутить себе часы');
select throws_ok(
  $$ insert into public.points_ledger (user_id, org_id, points, reason)
     values ('f0000000-0000-4000-8000-000000000001', '0e000000-0000-4000-8000-000000000001', 1000, 'cheat') $$,
  '42501', null, 'Волонтёр не может начислить себе баллы');

select is(
  pg_temp.affected($$ update public.profiles set full_name = 'Арман К.' where id = 'f0000000-0000-4000-8000-000000000001' $$),
  1, 'Волонтёр меняет свой профиль');
select is(
  pg_temp.affected($$ update public.profiles set full_name = 'Взлом' where id = 'f0000000-0000-4000-8000-000000000002' $$),
  0, 'Волонтёр не меняет чужой профиль');

-- Споры: только по своему подтверждению.
select lives_ok(
  $$ insert into public.disputes (confirmation_id, comment)
     select id, 'Прошу пересмотреть оценку.' from public.hour_confirmations
     where quest_id = '9e000000-0000-4000-8000-000000000001' $$,
  'Волонтёр открывает спор по своему подтверждению');

-- Уведомления: только отметка о прочтении.
select is(
  pg_temp.affected($$ update public.notifications set read_at = now() $$) > 0,
  true, 'Волонтёр отмечает свои уведомления прочитанными');
select throws_ok(
  $$ update public.notifications set payload = '{}' $$,
  '42501', null, 'Волонтёр не меняет содержимое уведомлений');

-- Прозрачность: правки своих часов видны, чужих — нет.
select pg_temp.login_as('f0000000-0000-4000-8000-000000000002');
select is((select count(*)::int from public.adjustments), 1, 'Волонтёр видит правку своих часов с причиной');

-- Чужой спор открыть нельзя, даже зная id: user_id берётся из подтверждения и не совпадёт.
select throws_ok(
  $$ insert into public.disputes (confirmation_id, comment)
     values (current_setting('test.vol1_confirmation')::uuid, 'Хочу оспорить чужие часы') $$,
  '42501', null, 'Нельзя открыть спор по чужому подтверждению');

select pg_temp.login_as('f0000000-0000-4000-8000-000000000006');
select is((select count(*)::int from public.disputes), 1, 'Волонтёр видит свой спор');
select is(
  pg_temp.affected($$ update public.disputes set status = 'resolved', resolution = 'Сам решил' $$),
  0, 'Волонтёр не может сам закрыть свой спор');

-- =========================== Координатор (coord1) ===========================
select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');

select is((select count(*)::int from public.quests), 8, 'Координатор видит все квесты, включая черновики');
select is((select count(*)::int from public.attendance_sessions), 7, 'Координатор видит все смены организации');
select is((select count(*)::int from public.audit_log), 0, 'Координатор не читает аудит (только админ)');
select lives_ok(
  $$ insert into public.quests (org_id, title, difficulty, address, lat, lng, starts_at, ends_at, capacity, coordinator_id)
     values ('0e000000-0000-4000-8000-000000000001', 'Новый квест', 'medium', 'Алматы, парк 28 панфиловцев',
             43.2587, 76.9535, now() + interval '4 days', now() + interval '4 days 3 hours', 10,
             'c0000000-0000-4000-8000-000000000001') $$,
  'Координатор создаёт квест в своей организации');
select is(
  pg_temp.affected($$ update public.memberships set role = 'admin' where user_id = 'c0000000-0000-4000-8000-000000000001' $$),
  0, 'Координатор не может повысить себя до админа');

-- =========================== Администратор ===========================
select pg_temp.login_as('a0000000-0000-4000-8000-000000000001');

select ok((select count(*) from public.audit_log) > 0, 'Админ читает аудит своей организации');
select is(
  pg_temp.affected($$ update public.disputes set status = 'resolved', resolution = 'Время выхода исправлено'
                      where user_id = 'f0000000-0000-4000-8000-000000000006' $$),
  1, 'Админ рассматривает спор');
select is(
  (select resolved_by from public.disputes where user_id = 'f0000000-0000-4000-8000-000000000006'),
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'В споре зафиксировано, кто его решил');

select * from finish();
rollback;
