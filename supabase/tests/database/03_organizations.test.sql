-- Этап 3: создание организации, приглашения, заявки, роли, защита последнего админа.
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

create function pg_temp.login_as(p_user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Подготовка (от имени владельца БД) ---------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('b0000000-0000-4000-8000-000000000001', 'stranger@other.test', '{"full_name":"Новый Человек"}');

insert into public.org_invites (org_id, code, role, expires_at) values
  ('0e000000-0000-4000-8000-000000000001', 'expired-invite-0', 'volunteer', now() - interval '1 hour');
insert into public.org_invites (org_id, code, role, revoked_at) values
  ('0e000000-0000-4000-8000-000000000001', 'revoked-invite-0', 'volunteer', now());
insert into public.org_invites (org_id, code, role, max_uses, uses) values
  ('0e000000-0000-4000-8000-000000000001', 'used-up-invite-0', 'volunteer', 1, 1);

-- =========================== Новый пользователь =========================================
select pg_temp.login_as('b0000000-0000-4000-8000-000000000001');

select is((select count(*)::int from public.quests), 0, 'До вступления квесты организации не видны');

select is(
  (select name from public.search_organizations('taza')),
  'Taza Qala', 'Организацию можно найти по названию');
select is(
  (select is_member from public.search_organizations('qala')), false, 'Поиск показывает, что я не участник');
select is((select count(*)::int from public.search_organizations('t')), 0, 'Слишком короткий запрос ничего не ищет');
select is((select count(*)::int from public.org_invites), 0, 'Чужие приглашения не видны');
select is((select count(*)::int from public.list_org_members('0e000000-0000-4000-8000-000000000001')), 0,
  'Список участников чужой организации пуст');

select is(
  (select org_name || ' / ' || role || ' / ' || coalesce(problem, 'ok') from public.get_invite_preview('tazaqala-join-01')),
  'Taza Qala / volunteer / ok', 'Превью приглашения показывает организацию и роль');
select is((select problem from public.get_invite_preview('no-such-invite00')), 'invite_not_found',
  'Несуществующий код распознаётся');

select throws_ok($$ select public.accept_invite('expired-invite-0') $$, 'P0001', 'invite_expired',
  'Просроченное приглашение не работает');
select throws_ok($$ select public.accept_invite('revoked-invite-0') $$, 'P0001', 'invite_revoked',
  'Отозванное приглашение не работает');
select throws_ok($$ select public.accept_invite('used-up-invite-0') $$, 'P0001', 'invite_exhausted',
  'Исчерпанное приглашение не работает');

select is((select role from public.accept_invite('tazaqala-join-01')), 'volunteer'::public.org_role,
  'Вступление по коду делает волонтёром');
select set_config('test.membership', (select id::text from public.memberships
  where user_id = 'b0000000-0000-4000-8000-000000000001'), true);
select is((select id::text from public.accept_invite('tazaqala-join-01')), current_setting('test.membership'),
  'Повторное открытие ссылки не создаёт дубль');
select is((select count(*)::int from public.quests), 7, 'После вступления видны опубликованные квесты');

select throws_ok($$ select public.request_to_join('0e000000-0000-4000-8000-000000000001') $$, 'P0001',
  'already_member', 'Участник не может подать заявку повторно');
select throws_ok($$ select public.create_invite('0e000000-0000-4000-8000-000000000001') $$, 'P0001',
  'not_allowed', 'Волонтёр не создаёт приглашения');

-- Своя организация.
select is((select slug from public.create_organization('Чистые Горы', 'clean-mountains', 'Уборка троп')),
  'clean-mountains', 'Пользователь создаёт организацию');
select is(
  (select m.role from public.memberships m join public.organizations o on o.id = m.org_id
   where o.slug = 'clean-mountains' and m.user_id = 'b0000000-0000-4000-8000-000000000001'),
  'admin'::public.org_role, 'Создатель становится админом');
select throws_ok($$ select public.create_organization('Дубль', 'taza-qala') $$, 'P0001', 'slug_taken',
  'Адрес организации уникален');
select throws_ok($$ select public.create_organization('Плохой адрес', 'Плохой адрес') $$, '23514', null,
  'Адрес организации — только латиница, цифры и дефис');
select throws_ok(
  $$ insert into public.org_invites (org_id) select id from public.organizations where slug = 'clean-mountains' $$,
  '42501', null, 'Приглашения создаются только через функцию');

-- =========================== Координатор =========================================
select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');

select throws_ok($$ select public.create_invite('0e000000-0000-4000-8000-000000000001', 'coordinator') $$,
  'P0001', 'not_allowed', 'Координатор не приглашает координаторов');
select matches((select code from public.create_invite('0e000000-0000-4000-8000-000000000001', 'volunteer', 24, 50)),
  '^[A-Za-z0-9_-]{16}$', 'Координатор создаёт приглашение волонтёров со случайным кодом');
select throws_ok(
  $$ select public.set_member_role(id, 'admin') from public.memberships
     where user_id = 'c0000000-0000-4000-8000-000000000001' $$,
  'P0001', 'not_allowed', 'Координатор не может назначать роли');

-- Заявка новичка: одобряет координатор.
select set_config('test.request', (select id::text from public.join_requests
  where user_id = 'f0000000-0000-4000-8000-000000000099'), true);
select is((select status from public.decide_join_request(current_setting('test.request')::uuid, true)),
  'approved'::public.join_request_status, 'Координатор одобряет заявку');
select throws_ok($$ select public.decide_join_request(current_setting('test.request')::uuid, false) $$,
  'P0001', 'request_closed', 'Решённую заявку нельзя пересмотреть');

reset role;
select is(
  (select role from public.memberships where user_id = 'f0000000-0000-4000-8000-000000000099'),
  'volunteer'::public.org_role, 'Одобренный заявитель стал волонтёром');
select is(
  (select count(*)::int from public.notifications
   where user_id = 'f0000000-0000-4000-8000-000000000099' and type = 'join_approved'),
  1, 'Заявитель получил уведомление');

-- =========================== Волонтёр =========================================
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select is(
  (select full_name || ':' || role from public.list_org_members('0e000000-0000-4000-8000-000000000001') limit 1),
  'Айгерим Нурланова:admin', 'Участники видят состав организации, админы — первыми');

-- =========================== Администратор =========================================
select pg_temp.login_as('a0000000-0000-4000-8000-000000000001');

select throws_ok($$ select public.create_invite('0e000000-0000-4000-8000-000000000001', 'admin') $$,
  'P0001', 'invalid_role', 'Приглашать сразу админом нельзя');
select set_config('test.coord_invite',
  (select code from public.create_invite('0e000000-0000-4000-8000-000000000001', 'coordinator', 24, 1)), true);

select is(
  (select role from public.set_member_role(
    (select id from public.memberships where user_id = 'f0000000-0000-4000-8000-000000000003'), 'coordinator')),
  'coordinator'::public.org_role, 'Админ назначает координатора');

select throws_ok(
  $$ select public.set_member_role(id, 'volunteer') from public.memberships
     where user_id = 'a0000000-0000-4000-8000-000000000001' $$,
  'P0001', 'last_admin', 'Последний админ не может понизить себя');
select throws_ok(
  $$ delete from public.memberships where user_id = 'a0000000-0000-4000-8000-000000000001' $$,
  'P0001', 'last_admin', 'Последний админ не может покинуть организацию');

select lives_ok(
  $$ select public.set_member_role(id, 'admin') from public.memberships
     where user_id = 'c0000000-0000-4000-8000-000000000002' $$,
  'Админ назначает второго админа');
select lives_ok(
  $$ select public.set_member_role(id, 'coordinator') from public.memberships
     where user_id = 'a0000000-0000-4000-8000-000000000001' $$,
  'Когда есть другой админ, можно сложить полномочия');

-- Приглашение координатора повышает уже вступившего волонтёра.
select pg_temp.login_as('f0000000-0000-4000-8000-000000000002');
select is((select role from public.accept_invite(current_setting('test.coord_invite'))),
  'coordinator'::public.org_role, 'Приглашение координатора повышает волонтёра');

select * from finish();
rollback;
