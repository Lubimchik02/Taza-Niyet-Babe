-- Этап 7: выпуск сертификата, публичная проверка, отзыв.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create function pg_temp.login_as(p_user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- =========================== Выпуск ===========================
-- Арман (vol1): квест 1 — 180 мин, оценки 5/5/4 → 5; квест 2 — 240 мин, 5/5/5 → 5.
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select set_config('t.cert', (select id::text from public.issue_certificate('0e000000-0000-4000-8000-000000000001')), true);

select is(
  (select full_name || ' / ' || total_minutes || ' / ' || quests_count || ' / ' || avg_rating
   from public.certificates where id = current_setting('t.cert')::uuid),
  'Арман Касымов / 420 / 2 / 5.00', 'Снимок: ФИО, минуты, квесты, средняя оценка');
select is(
  (select jsonb_agg(q ->> 'title' order by q ->> 'date') from public.certificates c, jsonb_array_elements(c.quests) q
   where c.id = current_setting('t.cert')::uuid),
  '["Субботник в парке Горького", "Берег Есентая: первая волна"]'::jsonb, 'Список квестов по дате');
select is(
  (select s ->> 'code' || ':' || (s ->> 'xp') from public.certificates c, jsonb_array_elements(c.skills) s
   where c.id = current_setting('t.cert')::uuid order by (s ->> 'xp')::int desc limit 1),
  'ecology:40', 'Навыки за квесты этой организации, самый прокачанный — первым');

select throws_ok($$ select public.issue_certificate('0e000000-0000-4000-8000-000000000002') $$,
  'P0001', 'no_confirmed_hours', 'Без подтверждённых часов в организации сертификат не выпускается');

select pg_temp.login_as('f0000000-0000-4000-8000-000000000009');
select throws_ok($$ select public.issue_certificate('0e000000-0000-4000-8000-000000000001') $$,
  'P0001', 'no_confirmed_hours', 'Волонтёр без подтверждённых часов сертификат не получит');

reset role;
update public.profiles set full_name = ' ' where id = 'f0000000-0000-4000-8000-000000000002';
select pg_temp.login_as('f0000000-0000-4000-8000-000000000002');
select throws_ok($$ select public.issue_certificate('0e000000-0000-4000-8000-000000000001') $$,
  'P0001', 'name_required', 'Без ФИО сертификат не выпускается');

select throws_ok(
  $$ insert into public.certificates (user_id, org_id, full_name, total_minutes, quests_count)
     values ('f0000000-0000-4000-8000-000000000002', '0e000000-0000-4000-8000-000000000001', 'Фальшивка', 99999, 999) $$,
  '42501', null, 'Нарисовать сертификат в обход функции нельзя');
select is((select count(*)::int from public.certificates where id = current_setting('t.cert')::uuid), 0,
  'Чужой сертификат через таблицу не виден');

reset role;
select throws_ok(
  $$ update public.certificates set total_minutes = 99999 where id = current_setting('t.cert')::uuid $$,
  'P0001', null, 'Данные выпущенного сертификата неизменны даже для владельца БД');

-- =========================== Публичная проверка ===========================
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is(
  (select full_name || ' / ' || org_name || ' / ' || total_minutes from public.verify_certificate(current_setting('t.cert')::uuid)),
  'Арман Касымов / Taza Qala / 420', 'Проверка работает без входа');
select is((select revoked_at from public.verify_certificate(current_setting('t.cert')::uuid)), null,
  'Действующий сертификат не отозван');
select is((select count(*)::int from public.verify_certificate(gen_random_uuid())), 0,
  'Несуществующий id — пусто');
select ok(
  not exists (select 1 from information_schema.routines r
              join information_schema.parameters p on p.specific_name = r.specific_name
              where r.routine_name = 'verify_certificate' and p.parameter_mode in ('OUT', 'INOUT')
                and p.parameter_name in ('user_id', 'email', 'phone', 'org_id')),
  'Проверка не раскрывает user_id, email, телефон');
select throws_ok($$ select count(*) from public.certificates $$, '42501', null, 'Аноним не читает таблицу сертификатов');
select throws_ok($$ select public.issue_certificate('0e000000-0000-4000-8000-000000000001') $$, '42501', null,
  'Аноним не выпускает сертификаты');

-- =========================== Отзыв ===========================
reset role;
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.revoke_certificate(current_setting('t.cert')::uuid) $$, 'P0001', 'not_allowed',
  'Волонтёр не отзывает сертификат');
select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.revoke_certificate(current_setting('t.cert')::uuid) $$, 'P0001', 'not_allowed',
  'Координатор не отзывает сертификат');
select pg_temp.login_as('a0000000-0000-4000-8000-000000000001');
select isnt((select revoked_at from public.revoke_certificate(current_setting('t.cert')::uuid)), null,
  'Админ организации отзывает сертификат');

reset role;
set local role anon;
select isnt((select revoked_at from public.verify_certificate(current_setting('t.cert')::uuid)), null,
  'Страница проверки показывает, что сертификат отозван');

select * from finish();
rollback;
