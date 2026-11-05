-- Этап 8: споры, журнал аудита, отчёт по часам, сертификаты организации.
begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

create function pg_temp.login_as(p_user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Подтверждения из seed (от имени владельца БД).
select set_config('t.vol1_conf', (select id::text from public.hour_confirmations
  where user_id = 'f0000000-0000-4000-8000-000000000001' and quest_id = '9e000000-0000-4000-8000-000000000001'), true);
select set_config('t.vol2_conf', (select id::text from public.hour_confirmations
  where user_id = 'f0000000-0000-4000-8000-000000000002' and quest_id = '9e000000-0000-4000-8000-000000000001'), true);
-- Спор Камилы (vol6) из seed: квест 2 «Сложная», подтверждено 180 мин, оценки 3/4/3 → 3★, 105 баллов.
select set_config('t.vol6_dispute', (select id::text from public.disputes
  where user_id = 'f0000000-0000-4000-8000-000000000006'), true);

-- =========================== Волонтёр открывает спор ===========================
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select is((select status from public.open_dispute(current_setting('t.vol1_conf')::uuid, 'Отработал больше, чем отмечено')),
  'open'::public.dispute_status, 'Волонтёр открывает спор по своим часам');
select throws_ok($$ select public.open_dispute(current_setting('t.vol1_conf')::uuid, 'Ещё раз') $$,
  'P0001', 'dispute_exists', 'Второй открытый спор по тем же часам нельзя');
select throws_ok($$ select public.open_dispute(current_setting('t.vol2_conf')::uuid, 'Чужие часы') $$,
  'P0001', 'not_allowed', 'Спор по чужим часам нельзя');
select throws_ok($$ select public.open_dispute(current_setting('t.vol1_conf')::uuid, ' ') $$,
  'P0001', 'reason_required', 'Спор без комментария нельзя');
select throws_ok(
  $$ insert into public.disputes (confirmation_id, comment) values (current_setting('t.vol1_conf')::uuid, 'В обход') $$,
  '42501', null, 'Открыть спор в обход функции нельзя');
reset role;
select is((select count(*)::int from public.notifications n
           where n.type = 'dispute_opened' and n.user_id = 'a0000000-0000-4000-8000-000000000001'), 1,
  'Админ получает уведомление о новом споре');

-- =========================== Права на рассмотрение ===========================
select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.resolve_dispute(current_setting('t.vol6_dispute')::uuid, 'resolved', 'Сам решу') $$,
  'P0001', 'not_allowed', 'Координатор не рассматривает споры');
select is((select count(*)::int from public.list_disputes('0e000000-0000-4000-8000-000000000001')), 0,
  'Координатор не видит список споров');

select pg_temp.login_as('a0000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.list_disputes('0e000000-0000-4000-8000-000000000001', 'open')), 2,
  'Админ видит открытые споры');
select is((select full_name || ' / ' || quest_title || ' / ' || confirmed_minutes
           from public.list_disputes('0e000000-0000-4000-8000-000000000001') where id = current_setting('t.vol6_dispute')::uuid),
  'Камила Исаева / Берег Есентая: первая волна / 180', 'В споре видно, кто, какой квест и сколько подтверждено');

-- =========================== Решение в пользу волонтёра ===========================
select throws_ok($$ select public.resolve_dispute(current_setting('t.vol6_dispute')::uuid, 'resolved', 'Ок', 200) $$,
  'P0001', 'reason_required', 'Решение без объяснения нельзя');
select throws_ok($$ select public.resolve_dispute(current_setting('t.vol6_dispute')::uuid, 'resolved',
                    'Ушла на 30 минут раньше, а не на час', 200) $$,
  'P0001', 'invalid_minutes', 'Минуты в решении — кратны 15');
select is((select status from public.resolve_dispute(current_setting('t.vol6_dispute')::uuid, 'resolved',
                    'Ушла на 30 минут раньше, а не на час', 210)),
  'resolved'::public.dispute_status, 'Админ решает спор в пользу волонтёра и исправляет часы');

reset role;
select is((select confirmed_minutes from public.hour_confirmations c
           join public.disputes d on d.confirmation_id = c.id where d.id = current_setting('t.vol6_dispute')::uuid),
  210, 'Подтверждённые часы исправлены');
select is((select old_value || '→' || new_value || ' / ' || reason from public.adjustments a
           join public.disputes d on d.confirmation_id = a.confirmation_id
           where d.id = current_setting('t.vol6_dispute')::uuid),
  '180→210 / Решение по спору: Ушла на 30 минут раньше, а не на час', 'Правка в журнале с решением как причиной');
-- 35 × 3.5 ч × 1.0 = 122.5 → 123; было 105 → компенсация +18, старая запись не тронута.
select is((select array_agg(points || ':' || reason order by id) from public.points_ledger
           where user_id = 'f0000000-0000-4000-8000-000000000006'),
  array['105:quest_completed', '18:dispute_adjustment'], 'Баллы — компенсирующей записью, история не переписана');
select is((select resolved_by from public.disputes where id = current_setting('t.vol6_dispute')::uuid),
  'a0000000-0000-4000-8000-000000000001'::uuid, 'Зафиксировано, кто решил спор');
select is((select count(*)::int from public.notifications
           where user_id = 'f0000000-0000-4000-8000-000000000006' and type = 'dispute_resolved'), 1,
  'Волонтёр получает уведомление о решении');

select pg_temp.login_as('a0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.resolve_dispute(current_setting('t.vol6_dispute')::uuid, 'rejected', 'Передумал') $$,
  'P0001', 'dispute_closed', 'Закрытый спор не пересматривается');

-- =========================== Отказ ===========================
select set_config('t.vol1_dispute', (select id::text from public.list_disputes('0e000000-0000-4000-8000-000000000001', 'open')), true);
select throws_ok($$ select public.resolve_dispute(current_setting('t.vol1_dispute')::uuid, 'rejected', 'Время верное', 240) $$,
  'P0001', 'invalid_minutes', 'При отказе часы не меняются');
select lives_ok($$ select public.resolve_dispute(current_setting('t.vol1_dispute')::uuid, 'rejected',
                   'Время подтверждено отметками QR') $$, 'Админ отклоняет спор');
reset role;
select is((select confirmed_minutes from public.hour_confirmations where id = current_setting('t.vol1_conf')::uuid), 180,
  'После отказа часы прежние');

select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select is((select status || ': ' || resolution from public.disputes where id = current_setting('t.vol1_dispute')::uuid),
  'rejected: Время подтверждено отметками QR', 'Волонтёр видит решение по своему спору');

-- =========================== Журнал аудита ===========================
select pg_temp.login_as('a0000000-0000-4000-8000-000000000001');
select is((select actor_name from public.list_audit_log('0e000000-0000-4000-8000-000000000001')
           where entity = 'disputes' and action = 'update' limit 1),
  'Айгерим Нурланова', 'Журнал аудита показывает, кто сделал изменение');
select ok((select bool_and(id < (select max(id) from public.audit_log))
           from public.list_audit_log('0e000000-0000-4000-8000-000000000001',
                                      (select max(id) from public.audit_log), 20)),
  'Журнал листается назад по id');
select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.list_audit_log('0e000000-0000-4000-8000-000000000001')), 0,
  'Координатор журнал аудита не видит');

-- =========================== Отчёт по часам ===========================
select pg_temp.login_as('a0000000-0000-4000-8000-000000000001');
select is((select count(*)::int || ':' || sum(minutes) from public.hours_report('0e000000-0000-4000-8000-000000000001',
             now() - interval '1 year', now() + interval '1 year')),
  '7:' || (180 + 180 + 135 + 180 + 240 + 240 + 210), 'Отчёт за год: все подтверждения и сумма минут');
select is((select count(*)::int from public.hours_report('0e000000-0000-4000-8000-000000000001',
             now() - interval '10 days', now())), 3, 'Отчёт за период — только квесты в этом периоде');
select is((select points from public.hours_report('0e000000-0000-4000-8000-000000000001',
             now() - interval '10 days', now()) where volunteer_id = 'f0000000-0000-4000-8000-000000000006'),
  123, 'Баллы в отчёте — с учётом решения по спору');
select throws_ok($$ select * from public.hours_report('0e000000-0000-4000-8000-000000000001', now(), now() - interval '1 day') $$,
  'P0001', 'invalid_period', 'Конец периода раньше начала — ошибка');

select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');
select throws_ok($$ select * from public.hours_report('0e000000-0000-4000-8000-000000000001', now() - interval '1 year', now()) $$,
  'P0001', 'not_allowed', 'Отчёт выгружает только админ');

select * from finish();
rollback;
