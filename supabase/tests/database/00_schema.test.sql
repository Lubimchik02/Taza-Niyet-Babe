-- Целостность схемы: RLS везде, журналы неизменяемы, защита от ошибок учёта часов.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- RLS -----------------------------------------------------------------------------------
select is(
  (select array_agg(c.relname order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'RLS включён на каждой таблице public'
);

select is(
  (select array_agg(c.relname order by c.relname)
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)),
  null,
  'У каждой таблицы есть хотя бы одна политика (иначе она бесполезна для клиента)'
);

select is(
  (select array_agg(table_name::text order by table_name)
   from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon'),
  null,
  'Роль anon не имеет привилегий ни на одну таблицу'
);

select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prosecdef
      and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false)
  ),
  'У всех security definer функций зафиксирован search_path'
);

-- Неизменяемые журналы (даже для владельца БД) --------------------------------------------
select throws_ok(
  $$ update public.points_ledger set points = points + 1000 $$,
  'P0001', null,
  'points_ledger: UPDATE запрещён'
);
select throws_ok(
  $$ delete from public.points_ledger $$,
  'P0001', null,
  'points_ledger: DELETE запрещён'
);
select throws_ok(
  $$ truncate public.points_ledger cascade $$,
  'P0001', null,
  'points_ledger: TRUNCATE запрещён'
);
select throws_ok(
  $$ update public.audit_log set action = 'forged' $$,
  'P0001', null,
  'audit_log: UPDATE запрещён'
);
select throws_ok(
  $$ delete from public.adjustments $$,
  'P0001', null,
  'adjustments: DELETE запрещён'
);

-- Защита учёта часов -----------------------------------------------------------------------
-- vol2 записан на предстоящий квест 3; первая активная смена создаётся, вторая — нет.
insert into public.attendance_sessions (quest_id, user_id, check_in_at, check_in_method)
values ('9e000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000002', now(), 'qr');

select throws_ok(
  $$ insert into public.attendance_sessions (quest_id, user_id, check_in_at, check_in_method)
     values ('9e000000-0000-4000-8000-000000000007', 'f0000000-0000-4000-8000-000000000002', now(), 'qr') $$,
  '23505', null,
  'Нельзя иметь два активных check-in одновременно'
);

select throws_ok(
  $$ update public.attendance_sessions
     set check_out_at = check_in_at - interval '1 minute', check_out_method = 'qr', status = 'closed'
     where user_id = 'f0000000-0000-4000-8000-000000000002' and check_out_at is null $$,
  '23514', null,
  'Check-out не может быть раньше check-in'
);

select throws_ok(
  $$ update public.hour_confirmations set confirmed_minutes = 100
     where user_id = 'f0000000-0000-4000-8000-000000000001'
       and quest_id = '9e000000-0000-4000-8000-000000000001' $$,
  '23514', null,
  'Подтверждённые минуты кратны 15'
);

select throws_ok(
  $$ insert into public.attendance_sessions (quest_id, user_id, check_in_at, check_out_at, check_in_method, check_out_method, status, client_event_id)
     select quest_id, user_id, check_in_at, check_out_at, check_in_method, check_out_method, status, client_event_id
     from (values ('9e000000-0000-4000-8000-000000000001'::uuid, 'f0000000-0000-4000-8000-000000000009'::uuid,
                   now() - interval '3 hours', now() - interval '1 hour', 'qr'::public.attendance_method,
                   'qr'::public.attendance_method, 'closed'::public.attendance_status,
                   'e0000000-0000-4000-8000-000000000001'::uuid),
                  ('9e000000-0000-4000-8000-000000000001'::uuid, 'f0000000-0000-4000-8000-000000000009'::uuid,
                   now() - interval '3 hours', now() - interval '1 hour', 'qr'::public.attendance_method,
                   'qr'::public.attendance_method, 'closed'::public.attendance_status,
                   'e0000000-0000-4000-8000-000000000001'::uuid)) as v (quest_id, user_id, check_in_at, check_out_at,
                   check_in_method, check_out_method, status, client_event_id) $$,
  '23505', null,
  'Повторная синхронизация офлайн-события (тот же client_event_id) не создаёт дубль'
);

-- Неизменяемые колонки и согласованность ----------------------------------------------------
select throws_ok(
  $$ update public.attendance_sessions set user_id = 'f0000000-0000-4000-8000-000000000009'
     where user_id = 'f0000000-0000-4000-8000-000000000001'
       and quest_id = '9e000000-0000-4000-8000-000000000001' $$,
  'P0001', null,
  'Смену нельзя «переписать» на другого волонтёра'
);

select throws_ok(
  $$ update public.quests set coordinator_id = 'f0000000-0000-4000-8000-000000000001'
     where id = '9e000000-0000-4000-8000-000000000003' $$,
  '23514', null,
  'Координатором квеста может быть только координатор/админ организации'
);

-- Аудит пишется автоматически ---------------------------------------------------------------
update public.quests set capacity = 13 where id = '9e000000-0000-4000-8000-000000000003';
select is(
  (select (old_value ->> 'capacity') || '→' || (new_value ->> 'capacity')
   from public.audit_log
   where entity = 'quests' and entity_id = '9e000000-0000-4000-8000-000000000003' and action = 'update'
   order by id desc limit 1),
  '12→13',
  'Изменение квеста попало в аудит со старым и новым значением'
);

select * from finish();
rollback;
