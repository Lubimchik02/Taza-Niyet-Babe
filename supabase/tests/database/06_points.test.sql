-- Этап 6: формула баллов, начисление при подтверждении, навыки, достижения, «Моя выгода», рейтинг.
begin;
create extension if not exists pgtap with schema extensions;
select plan(41);

create function pg_temp.login_as(p_user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- =========================== Конфигурация = задание ===========================
select is((select array_agg(points_per_hour order by difficulty) from public.points_rules),
  array[10, 20, 35, 50], 'Баллы за час: Лёгкая 10, Средняя 20, Сложная 35, Экстрим 50');
select is((select array_agg(multiplier_pct order by rating) from public.rating_multipliers),
  array[60, 80, 100, 115, 130], 'Множитель оценки: 0.6 / 0.8 / 1.0 / 1.15 / 1.3');
select is((select array_agg(code order by position) from public.levels),
  array['newcomer', 'helper', 'activist', 'leader', 'ambassador'],
  'Уровни: Новичок → Помощник → Активист → Лидер → Амбассадор');

-- =========================== Формула ===========================
select is(private.quest_points('easy', 180, 4::smallint), 35, '10 × 3 ч × 1.15 = 34.5 → 35 (половина вверх)');
select is(private.quest_points('medium', 45, 5::smallint), 20, '20 × 0.75 ч × 1.3 = 19.5 → 20');
select is(private.quest_points('hard', 15, 1::smallint), 5, '35 × 0.25 ч × 0.6 = 5.25 → 5');
select is(private.quest_points('extreme', 480, 3::smallint), 400, '50 × 8 ч × 1.0 = 400');
select is(private.quest_points('easy', 0, 5::smallint), 0, 'Ноль минут — ноль баллов');
select is(array[private.overall_rating(5::smallint, 4::smallint, 4::smallint),
                private.overall_rating(4::smallint, 5::smallint, 5::smallint),
                private.overall_rating(1::smallint, 1::smallint, 2::smallint)],
  array[4, 5, 1]::smallint[], 'Итоговая оценка — округлённая средняя трёх');

select is(
  (select array_agg(points order by points) from public.points_ledger
   where user_id = 'f0000000-0000-4000-8000-000000000001'),
  array[39, 182], 'Seed: Арману начислено по формуле (39 и 182)');

-- =========================== Начисление при подтверждении ===========================
-- vol7 отработал 90 минут на квесте 3 (Средняя), оценки 5/5/4 → 5★: 20 × 1.5 × 1.3 = 39.
update public.quests set status = 'completed', bags_collected = 10, area_m2 = 500
where id = '9e000000-0000-4000-8000-000000000003';
insert into public.attendance_sessions (quest_id, user_id, status, check_in_at, check_out_at, check_in_method, check_out_method)
values ('9e000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000007', 'confirmed',
        now() - interval '2 hours', now() - interval '30 minutes', 'qr', 'qr');
insert into public.hour_confirmations (quest_id, user_id, confirmed_minutes, rating_quality, rating_activity, rating_teamwork)
values ('9e000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000007', 90, 5, 5, 4);

select is((select points from public.points_ledger where user_id = 'f0000000-0000-4000-8000-000000000007'), 39,
  'При подтверждении часов баллы начисляются автоматически по формуле');
select is((select count(*)::int from public.notifications
           where user_id = 'f0000000-0000-4000-8000-000000000007' and type = 'points_awarded'
             and (payload ->> 'points')::int = 39), 1, 'Волонтёр получает уведомление о баллах');
select is((select string_agg(s.code || ':' || us.xp, ',' order by s.code) from public.user_skills us
           join public.skills s on s.id = us.skill_id where us.user_id = 'f0000000-0000-4000-8000-000000000007'),
  'ecology:15,teamwork:10', 'Прокачиваются навыки квеста');
select is((select count(*)::int from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id
           where ua.user_id = 'f0000000-0000-4000-8000-000000000007' and a.code = 'first_quest'), 1,
  'Достижение «Первый квест»');
select is((select count(*)::int from public.notifications
           where user_id = 'f0000000-0000-4000-8000-000000000007' and type = 'achievement_unlocked'), 1,
  'Уведомление о достижении');

-- Ноль подтверждённых минут (не работал) — ни баллов, ни опыта.
insert into public.attendance_sessions (quest_id, user_id, status, check_in_at, check_out_at, check_in_method, check_out_method)
values ('9e000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000002', 'confirmed',
        now() - interval '2 hours', now() - interval '119 minutes', 'qr', 'qr');
insert into public.hour_confirmations (quest_id, user_id, confirmed_minutes, rating_quality, rating_activity, rating_teamwork)
values ('9e000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000002', 0, 1, 1, 1);
select is((select count(*)::int from public.points_ledger l
           where l.user_id = 'f0000000-0000-4000-8000-000000000002' and l.quest_id = '9e000000-0000-4000-8000-000000000003'),
  0, 'Ноль минут — нет записи в журнале баллов');

-- =========================== Достижения ===========================
-- Арман: экстрим на 60 минут → «Экстрим пройден»; итого 180 + 240 + 60 + 150 = 630 мин → «10 часов».
update public.quests set status = 'completed' where id in ('9e000000-0000-4000-8000-000000000006', '9e000000-0000-4000-8000-000000000005');
insert into public.quest_signups (quest_id, user_id, status)
values ('9e000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000001', 'signed_up');
insert into public.hour_confirmations (quest_id, user_id, confirmed_minutes, rating_quality, rating_activity, rating_teamwork)
values ('9e000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000001', 60, 3, 3, 3);
select ok(exists (select 1 from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id
                  where ua.user_id = 'f0000000-0000-4000-8000-000000000001' and a.code = 'extreme_done'),
  '«Экстрим пройден» после подтверждённого экстрим-квеста');
select ok(not exists (select 1 from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id
                      where ua.user_id = 'f0000000-0000-4000-8000-000000000001' and a.code = 'hours_10'),
  '«10 часов» ещё не выдано при 480 минутах');
insert into public.hour_confirmations (quest_id, user_id, confirmed_minutes, rating_quality, rating_activity, rating_teamwork)
values ('9e000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000001', 150, 4, 4, 4);
select ok(exists (select 1 from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id
                  where ua.user_id = 'f0000000-0000-4000-8000-000000000001' and a.code = 'hours_10'),
  '«10 часов» выдано при 630 минутах');
select is((select count(*)::int from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id
           where ua.user_id = 'f0000000-0000-4000-8000-000000000001' and a.code = 'first_quest'), 1,
  'Достижение не выдаётся повторно');

-- Серия: последние 4 завершённых квеста Арман отработал; неявка на квест 3 была раньше них.
update public.quests set starts_at = now() - interval '30 days', ends_at = now() - interval '30 days' + interval '3 hours'
where id = '9e000000-0000-4000-8000-000000000003';
select is(private.attendance_streak('f0000000-0000-4000-8000-000000000001'), 4, 'Серия: 4 квеста подряд');
-- Та же неявка, но самая поздняя по дате — серия обнуляется.
update public.quests set starts_at = now() + interval '30 days', ends_at = now() + interval '30 days 3 hours'
where id = '9e000000-0000-4000-8000-000000000003';
select is(private.attendance_streak('f0000000-0000-4000-8000-000000000001'), 0, 'Неявка обрывает серию');
update public.quests set starts_at = now() - interval '2 hours', ends_at = now() - interval '30 minutes'
where id = '9e000000-0000-4000-8000-000000000003';

-- =========================== «Моя выгода» ===========================
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select is((select total_minutes || '/' || quests_count || '/' || total_points from public.my_benefit()),
  '630/4/' || (39 + 182 + 50 + 101), 'Итоги: минуты, квесты и баллы (101 = 35 × 2,5 ч × 1,15)');
select is((select level_code || '→' || next_level_code from public.my_benefit()), 'activist→leader',
  '372 балла — «Активист», следующий «Лидер»');
select is((select next_level_min_points from public.my_benefit()), 700, 'Порог следующего уровня');
select is((select (s ->> 'xp')::int from public.my_benefit(), jsonb_array_elements(skills) s where s ->> 'code' = 'ecology'),
  15 + 25 + 15, 'Опыт навыка «Экология» накоплен по всем квестам');
select is((select jsonb_array_length(achievements) from public.my_benefit()), 5,
  'Видны все достижения, включая закрытые');
select is((select count(*)::int from public.my_benefit(), jsonb_array_elements(achievements) a
           where a ->> 'unlocked_at' is not null), 3, 'Открыто три достижения');
select is((select team_bags || '/' || team_area_m2 from public.my_benefit()), '64/9500',
  'Вклад команд, в которых работал: мешки и м²');
select is((select minutes from public.my_hours(now() - interval '10 days', now() + interval '30 days')), 240 + 60 + 150,
  'Часы за произвольный период (по дате квеста)');
select is((select minutes from public.my_hours(now() - interval '20 days', now() - interval '10 days')), 180,
  'Другой период — другие часы');

-- =========================== Рейтинг ===========================
select is((select full_name || ':' || points from public.org_leaderboard('0e000000-0000-4000-8000-000000000001') where place = 1),
  'Арман Касымов:372', 'Первое место — больше всех баллов');
select is((select is_me from public.org_leaderboard('0e000000-0000-4000-8000-000000000001') where place = 1), true,
  'Своя строка отмечена');
reset role;
update public.profiles set hide_from_leaderboard = true where id = 'f0000000-0000-4000-8000-000000000005';
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.org_leaderboard('0e000000-0000-4000-8000-000000000001')
           where user_id = 'f0000000-0000-4000-8000-000000000005'), 0, 'Скрывшийся в настройках не виден в рейтинге');
select throws_ok($$ select * from public.org_leaderboard('0e000000-0000-4000-8000-000000000001', 'week') $$,
  'P0001', 'invalid_period', 'Период рейтинга — месяц или всё время');

reset role;
insert into auth.users (id, email) values ('b0000000-0000-4000-8000-000000000001', 'outsider@other.test');
select pg_temp.login_as('b0000000-0000-4000-8000-000000000001');
select throws_ok($$ select * from public.org_leaderboard('0e000000-0000-4000-8000-000000000001') $$,
  'P0001', 'not_allowed', 'Рейтинг чужой организации недоступен');

-- Рейтинг за месяц считает баллы по моменту подтверждения часов, как и часы.
reset role;
update public.hour_confirmations set confirmed_at = now() - interval '40 days'
where user_id = 'f0000000-0000-4000-8000-000000000007';
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.org_leaderboard('0e000000-0000-4000-8000-000000000001', 'month')
           where user_id = 'f0000000-0000-4000-8000-000000000007'), 0,
  'Баллы за часы, подтверждённые в прошлом месяце, не попадают в рейтинг месяца');
select is((select points from public.org_leaderboard('0e000000-0000-4000-8000-000000000001', 'all')
           where user_id = 'f0000000-0000-4000-8000-000000000007'), 39,
  '…но учитываются за всё время');

-- =========================== Вклад команды ===========================
select pg_temp.login_as('f0000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.set_quest_contribution('9e000000-0000-4000-8000-000000000001', 1, 1) $$,
  'P0001', 'not_allowed', 'Волонтёр не вносит вклад команды');
select throws_ok($$ insert into public.points_rules (difficulty, points_per_hour) values ('easy', 1000) $$,
  '42501', null, 'Формулу нельзя изменить из приложения');

select pg_temp.login_as('c0000000-0000-4000-8000-000000000001');
select is((select bags_collected from public.set_quest_contribution('9e000000-0000-4000-8000-000000000001', 30, 6500)), 30,
  'Координатор вносит, сколько мешков убрали');

select * from finish();
rollback;
