-- Этап 4: лента, карточка, запись, лист ожидания, отмена, создание и правка квеста, фото.
begin;
create extension if not exists pgtap with schema extensions;
select plan(44);

create function pg_temp.login_as(p_user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Квест 4: «Ботанический сад», 3 места — заняты vol3, vol4, vol5; в очереди vol6, затем vol8.
select set_config('test.q4', '9e000000-0000-4000-8000-000000000004', true);

-- Данные квеста 4 для save_quest (от имени владельца БД).
select set_config('test.q4_data', (
  select jsonb_build_object(
    'title', title, 'description', description, 'difficulty', difficulty, 'status', status,
    'address', address, 'lat', lat, 'lng', lng, 'starts_at', starts_at, 'ends_at', ends_at,
    'capacity', capacity, 'coordinator_id', coordinator_id)::text
  from public.quests where id = '9e000000-0000-4000-8000-000000000004'), true);

insert into auth.users (id, email) values ('b0000000-0000-4000-8000-000000000001', 'outsider@other.test');

select ok(
  not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=%', false)
  ),
  'У всех security definer функций в public зафиксирован search_path');

-- =========================== Лента и карточка ===========================
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.quest_feed()), 5, 'Лента: 5 предстоящих опубликованных квестов');
select is((select count(*)::int from public.quest_feed() where status = 'draft'), 0, 'Волонтёр не видит черновики в ленте');
select is((select taken || '/' || capacity || ' +' || waitlisted from public.quest_feed()
           where id = current_setting('test.q4')::uuid), '3/3 +2', 'Лента показывает занятые места и очередь');
select is((select count(*)::int from public.get_quest('9e000000-0000-4000-8000-000000000008')), 0,
  'Карточку черновика волонтёр не получит');
select is((select jsonb_array_length(skills) from public.get_quest('9e000000-0000-4000-8000-000000000003')), 2,
  'Карточка содержит прокачиваемые навыки');
select is((select coordinator_name from public.get_quest('9e000000-0000-4000-8000-000000000003')),
  'Мадина Ержанова', 'Карточка показывает координатора');

select is((select string_agg(title, ' | ' order by starts_at) from public.my_quests()),
  'Субботник в парке Горького | Берег Есентая: первая волна | Берег Есентая: вторая волна | Большое Алматинское озеро',
  '«Мои квесты»: все записи волонтёра, включая прошедшие');
select is((select count(*)::int from public.my_quests() where my_status = 'cancelled'), 0,
  'Отменённые записи в «Мои квесты» не попадают');

-- =========================== Запись и лист ожидания ===========================
select is((select status from public.signup_for_quest(current_setting('test.q4')::uuid)),
  'waitlisted'::public.signup_status, 'Мест нет — волонтёр попадает в лист ожидания');
select is((select my_waitlist_position from public.get_quest(current_setting('test.q4')::uuid)), 3,
  'Позиция в очереди — третья');
select is((select status from public.signup_for_quest(current_setting('test.q4')::uuid)),
  'waitlisted'::public.signup_status, 'Повторное нажатие ничего не меняет');
select throws_ok($$ select public.signup_for_quest('9e000000-0000-4000-8000-000000000001') $$,
  'P0001', 'quest_closed', 'На завершённый квест записаться нельзя');
select throws_ok($$ select public.signup_for_quest('9e000000-0000-4000-8000-000000000008') $$,
  'P0001', 'quest_not_found', 'На черновик записаться нельзя');
select throws_ok(
  $$ insert into public.quest_signups (quest_id, user_id) values (current_setting('test.q4')::uuid,
     'f0000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'Записаться в обход функции нельзя');

-- Освободилось место: vol3 отменяет запись — место переходит первому в очереди (vol6).
select pg_temp.login_as('f0000000-0000-4000-8000-000000000003');
select is((select status from public.cancel_signup(current_setting('test.q4')::uuid)),
  'cancelled'::public.signup_status, 'Волонтёр отменяет запись заранее');

reset role;
select is((select status from public.quest_signups
           where quest_id = current_setting('test.q4')::uuid and user_id = 'f0000000-0000-4000-8000-000000000006'),
  'signed_up'::public.signup_status, 'Первый из очереди автоматически получил место');
select is((select count(*)::int from public.notifications
           where user_id = 'f0000000-0000-4000-8000-000000000006' and type = 'waitlist_promoted'),
  1, 'Он получил уведомление о месте');
select is(private.quest_taken(current_setting('test.q4')::uuid), 3, 'Мест занято по-прежнему не больше лимита');

select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select is((select my_waitlist_position from public.get_quest(current_setting('test.q4')::uuid)), 2,
  'Очередь сдвинулась');

select pg_temp.login_as('f0000000-0000-4000-8000-000000000008');
select lives_ok($$ select public.cancel_signup(current_setting('test.q4')::uuid) $$,
  'Из листа ожидания можно выйти в любой момент');

-- vol3 передумал: снова записывается — встаёт в конец очереди.
select pg_temp.login_as('f0000000-0000-4000-8000-000000000003');
select is((select status from public.signup_for_quest(current_setting('test.q4')::uuid)),
  'waitlisted'::public.signup_status, 'Повторная запись после отмены — в очередь, если мест нет');

-- Поздняя отмена.
reset role;
update public.quests set starts_at = now() + interval '2 hours', ends_at = now() + interval '5 hours'
where id = '9e000000-0000-4000-8000-000000000003';
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.cancel_signup('9e000000-0000-4000-8000-000000000003') $$,
  'P0001', 'cancel_too_late', 'Отменить запись позже чем за N часов нельзя');
select throws_ok($$ select public.cancel_signup('9e000000-0000-4000-8000-000000000005') $$,
  'P0001', 'not_signed_up', 'Нельзя отменить то, на что не записан');

-- Чужая организация.
select pg_temp.login_as('b0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.signup_for_quest(current_setting('test.q4')::uuid) $$,
  'P0001', 'quest_not_found', 'Квест чужой организации недоступен для записи');
select is((select count(*)::int from public.quest_feed()), 0, 'Лента чужого пустая');

-- Много записей подряд не превышают лимит: на квест 5 (8 мест, 1 занято) записываются 11 человек.
reset role;
do $$
declare
  v_user uuid;
begin
  for v_user in select user_id from public.memberships
                where org_id = '0e000000-0000-4000-8000-000000000001'
                  and user_id <> 'f0000000-0000-4000-8000-000000000009'
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', v_user)::text, true);
    perform public.signup_for_quest('9e000000-0000-4000-8000-000000000005');
  end loop;
end;
$$;
select is(
  (select count(*) filter (where status = 'signed_up') || '/' || count(*) filter (where status = 'waitlisted')
   from public.quest_signups where quest_id = '9e000000-0000-4000-8000-000000000005'),
  '8/5', 'Лимит мест соблюдён, остальные в очереди');

-- =========================== Координатор: создание и правка ===========================
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ select public.save_quest('0e000000-0000-4000-8000-000000000001', current_setting('test.q4_data')::jsonb, null, null) $$,
  'P0001', 'not_allowed', 'Волонтёр не создаёт квесты');
select is((select count(*)::int from public.list_quest_participants(current_setting('test.q4')::uuid)), 0,
  'Волонтёр не видит список участников');

select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');
select is(
  (select count(*)::int from public.list_quest_participants(current_setting('test.q4')::uuid) where status = 'waitlisted'),
  2, 'Координатор видит очередь квеста');
select is(
  (select full_name from public.list_quest_participants(current_setting('test.q4')::uuid) where queue_position = 1),
  'Арман Касымов', 'Очередь упорядочена по времени');

-- Увеличили число мест — очередь автоматически получает места.
select is(
  (select capacity from public.save_quest('0e000000-0000-4000-8000-000000000001', current_setting('test.q4_data')::jsonb || '{"capacity": 5}', array['5c000000-0000-4000-8000-000000000002'::uuid], current_setting('test.q4')::uuid)),
  5, 'Координатор увеличивает число мест');
select is((select taken || '+' || waitlisted from public.get_quest(current_setting('test.q4')::uuid)), '5+0',
  'Очередь получила освободившиеся места');
select throws_ok(
  $$ select public.save_quest('0e000000-0000-4000-8000-000000000001', current_setting('test.q4_data')::jsonb || '{"capacity": 2}', null, current_setting('test.q4')::uuid) $$,
  'P0001', 'capacity_below_taken', 'Нельзя сделать мест меньше, чем уже записано');
select throws_ok(
  $$ select public.save_quest('0e000000-0000-4000-8000-000000000001', current_setting('test.q4_data')::jsonb || '{"capacity": 5, "status": "draft"}', null, current_setting('test.q4')::uuid) $$,
  'P0001', 'invalid_status', 'Опубликованный квест нельзя вернуть в черновик');

select set_config('test.new_quest', (
  select id::text from public.save_quest('0e000000-0000-4000-8000-000000000001', current_setting('test.q4_data')::jsonb || jsonb_build_object(
      'title', 'Новый квест у реки', 'status', 'published', 'capacity', 4,
      'bring_items', jsonb_build_array('Вода'), 'coordinator_contact', '+7 700 000 00 01'), array['5c000000-0000-4000-8000-000000000001'::uuid, '5c000000-0000-4000-8000-000000000002'::uuid], null)), true);
select is((select status || ' / ' || jsonb_array_length(skills) || ' навыка / ' || coordinator_contact
           from public.get_quest(current_setting('test.new_quest')::uuid)),
  'published / 2 навыка / +7 700 000 00 01', 'Координатор создаёт и публикует квест с навыками');

reset role;
select is((select count(*)::int from public.notifications where type = 'new_quest'
           and payload ->> 'quest_id' = current_setting('test.new_quest')),
  (select count(*)::int - 1 from public.memberships where org_id = '0e000000-0000-4000-8000-000000000001'),
  'Все участники, кроме автора, получили уведомление о новом квесте');

-- Отмена квеста.
select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');
select lives_ok(
  $$ select public.save_quest('0e000000-0000-4000-8000-000000000001', current_setting('test.q4_data')::jsonb || '{"capacity": 5, "status": "cancelled"}', null, current_setting('test.q4')::uuid) $$,
  'Координатор отменяет квест');
select is((select count(*)::int from public.quest_feed() where id = current_setting('test.q4')::uuid), 0,
  'Отменённый квест исчезает из ленты');
reset role;
select is((select count(*)::int from public.notifications where type = 'quest_cancelled'
           and payload ->> 'quest_id' = current_setting('test.q4')), 5,
  'Все записанные получили уведомление об отмене');

-- =========================== Фото в Storage ===========================
select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('quest-photos', '0e000000-0000-4000-8000-000000000001/9e000000-0000-4000-8000-000000000003/before.jpg',
             'c0000000-0000-4000-8000-000000000001') $$,
  'Координатор загружает фото «до»');

select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('quest-photos', '0e000000-0000-4000-8000-000000000001/9e000000-0000-4000-8000-000000000003/fake.jpg') $$,
  '42501', null, 'Волонтёр не загружает фото квеста');
select is((select count(*)::int from storage.objects where bucket_id = 'quest-photos'), 1,
  'Участник организации видит фото квеста');

select pg_temp.login_as('b0000000-0000-4000-8000-000000000001');
select is((select count(*)::int from storage.objects where bucket_id = 'quest-photos'), 0,
  'Чужой не видит фото организации');

select * from finish();
rollback;
