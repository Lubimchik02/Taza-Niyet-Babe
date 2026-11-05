-- Изоляция организаций: пользователь не видит и не может изменить данные чужой организации.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Помощники ---------------------------------------------------------------------------------
create function pg_temp.login_as(p_user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Сколько строк затронула команда (с учётом RLS вызывающего).
create function pg_temp.affected(p_sql text) returns integer language plpgsql as $$
declare
  n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Вторая организация с собственным админом ------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values ('b0000000-0000-4000-8000-000000000001', 'outsider@other.test', '{"full_name":"Чужой Админ"}');

insert into public.organizations (id, name, slug, created_by)
values ('0e000000-0000-4000-8000-000000000002', 'Other Org', 'other-org', 'b0000000-0000-4000-8000-000000000001');

insert into public.quests (id, org_id, title, difficulty, status, address, lat, lng, starts_at, ends_at, capacity)
values ('9e000000-0000-4000-8000-0000000000b1', '0e000000-0000-4000-8000-000000000002', 'Чужой квест',
        'easy', 'published', 'Астана, набережная', 51.16, 71.47, now() + interval '1 day',
        now() + interval '1 day 2 hours', 5);

-- Админ чужой организации смотрит на Taza Qala --------------------------------------------------
select pg_temp.login_as('b0000000-0000-4000-8000-000000000001');

select is((select count(*)::int from public.organizations where id = '0e000000-0000-4000-8000-000000000001'), 0,
  'Чужая организация не видна');
select is((select count(*)::int from public.memberships where org_id = '0e000000-0000-4000-8000-000000000001'), 0,
  'Участники чужой организации не видны');
select is((select count(*)::int from public.profiles where id <> 'b0000000-0000-4000-8000-000000000001'), 0,
  'Профили людей без общей организации не видны');
select is((select count(*)::int from public.quests where org_id = '0e000000-0000-4000-8000-000000000001'), 0,
  'Квесты чужой организации не видны');
select is((select count(*)::int from public.tasks where org_id = '0e000000-0000-4000-8000-000000000001'), 0,
  'Задачи чужой организации не видны');
select is((select count(*)::int from public.quest_signups), 0, 'Записи на квесты чужой организации не видны');
select is((select count(*)::int from public.attendance_sessions), 0, 'Смены чужой организации не видны');
select is((select count(*)::int from public.hour_confirmations), 0, 'Подтверждённые часы чужой организации не видны');
select is((select count(*)::int from public.points_ledger), 0, 'Баллы чужой организации не видны');
select is((select count(*)::int from public.disputes), 0, 'Споры чужой организации не видны');
select is((select count(*)::int from public.audit_log where org_id = '0e000000-0000-4000-8000-000000000001'), 0,
  'Аудит чужой организации не виден');
select is((select count(*)::int from public.user_skills), 0, 'Навыки чужих волонтёров не видны');

select is(
  pg_temp.affected($$ update public.quests set title = 'Взлом' where org_id = '0e000000-0000-4000-8000-000000000001' $$),
  0, 'Чужие квесты нельзя изменить');
select is(
  pg_temp.affected($$ delete from public.memberships where org_id = '0e000000-0000-4000-8000-000000000001' $$),
  0, 'Чужих участников нельзя исключить');

select throws_ok(
  $$ insert into public.memberships (org_id, user_id, role)
     values ('0e000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'admin') $$,
  '42501', null,
  'Нельзя назначить себя админом чужой организации');

select throws_ok(
  $$ insert into public.quests (org_id, title, difficulty, address, lat, lng, starts_at, ends_at, capacity)
     values ('0e000000-0000-4000-8000-000000000001', 'Чужой квест', 'easy', 'Алматы', 43.2, 76.9,
             now() + interval '1 day', now() + interval '1 day 2 hours', 5) $$,
  '42501', null,
  'Нельзя создать квест в чужой организации');

select throws_ok(
  $$ update public.quests set org_id = '0e000000-0000-4000-8000-000000000001'
     where id = '9e000000-0000-4000-8000-0000000000b1' $$,
  'P0001', null,
  'Нельзя перенести свой квест в чужую организацию');

-- Админ Taza Qala не видит чужую организацию -------------------------------------------------
select pg_temp.login_as('a0000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.quests where org_id = '0e000000-0000-4000-8000-000000000002'), 0,
  'Изоляция работает в обе стороны');

-- Анонимный доступ ---------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select count(*) from public.quests $$, '42501', null, 'anon не читает квесты');
select throws_ok($$ select count(*) from public.profiles $$, '42501', null, 'anon не читает профили');

select * from finish();
rollback;
