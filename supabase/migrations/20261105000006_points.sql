-- =====================================================================================
-- Этап 6: баллы, уровни, навыки, достижения, «Моя выгода», рейтинг.
--
--   баллы = базовые_баллы_сложности × подтверждённые_часы × множитель_оценки
--
-- Значения формулы — в конфигурационных таблицах (меняются одной миграцией). Баллы начисляет
-- триггер на подтверждение часов: в points_ledger (только добавление), вместе с опытом навыков
-- и достижениями. Клиент ничего не начисляет и не может (привилегии отозваны на этапе 2).
-- Арифметика — целочисленная: множитель хранится в процентах, округление — половина вверх.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Конфигурация (читается всеми вошедшими, меняется только миграцией)
-- -------------------------------------------------------------------------------------
create table public.points_rules (
  difficulty public.quest_difficulty primary key,
  points_per_hour integer not null check (points_per_hour between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rating_multipliers (
  rating smallint primary key check (rating between 1 and 5),
  multiplier_pct integer not null check (multiplier_pct between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.levels (
  code text primary key check (code ~ '^[a-z]+$'),
  position smallint not null unique check (position >= 1),
  min_points integer not null unique check (min_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.points_rules (difficulty, points_per_hour) values
  ('easy', 10), ('medium', 20), ('hard', 35), ('extreme', 50);
insert into public.rating_multipliers (rating, multiplier_pct) values
  (1, 60), (2, 80), (3, 100), (4, 115), (5, 130);
-- Новичок → Помощник → Активист → Лидер → Амбассадор
insert into public.levels (code, position, min_points) values
  ('newcomer', 1, 0), ('helper', 2, 100), ('activist', 3, 300), ('leader', 4, 700), ('ambassador', 5, 1500);

do $$
declare t text;
begin
  foreach t in array array['points_rules', 'rating_multipliers', 'levels'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', t);
  end loop;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Формула
-- -------------------------------------------------------------------------------------

-- Средняя из трёх оценок, округлённая (три целых не дают ровно .5, ничьих нет).
create function private.overall_rating(p_quality smallint, p_activity smallint, p_teamwork smallint)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select round((p_quality + p_activity + p_teamwork) / 3.0)::smallint;
$$;

-- Целочисленно: points_per_hour × минуты × процент / 6000, округление половины вверх.
create function private.quest_points(p_difficulty public.quest_difficulty, p_minutes integer, p_rating smallint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select ((2::bigint * r.points_per_hour * p_minutes * m.multiplier_pct + 6000) / 12000)::integer
  from public.points_rules r, public.rating_multipliers m
  where r.difficulty = p_difficulty and m.rating = p_rating;
$$;

-- -------------------------------------------------------------------------------------
-- Достижения
-- -------------------------------------------------------------------------------------

-- Сколько последних завершённых квестов подряд, на которые человек был записан, он отработал.
create function private.attendance_streak(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with history as (
    select q.starts_at,
           exists (select 1 from public.hour_confirmations c
                   where c.quest_id = q.id and c.user_id = p_user_id and c.confirmed_minutes > 0) as attended
    from public.quest_signups s
    join public.quests q on q.id = s.quest_id
    where s.user_id = p_user_id and s.status = 'signed_up' and q.status = 'completed'
  ),
  ordered as (
    select attended, row_number() over (order by starts_at desc) as rn from history
  )
  select coalesce(min(rn) - 1, (select count(*) from ordered))::integer
  from ordered where not attended;
$$;

-- Выдаёт недостающие достижения и уведомляет о новых.
create function private.evaluate_achievements(p_user_id uuid, p_org_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_minutes integer;
  v_quests integer;
  v_extreme boolean;
  v_streak integer;
  v_earned text[] := '{}';
  v_new record;
  v_count integer := 0;
begin
  select coalesce(sum(c.confirmed_minutes), 0), count(*) filter (where c.confirmed_minutes > 0),
         coalesce(bool_or(q.difficulty = 'extreme' and c.confirmed_minutes > 0), false)
  into v_minutes, v_quests, v_extreme
  from public.hour_confirmations c join public.quests q on q.id = c.quest_id
  where c.user_id = p_user_id;
  v_streak := private.attendance_streak(p_user_id);

  if v_quests >= 1 then v_earned := array_append(v_earned, 'first_quest'); end if;
  if v_minutes >= 600 then v_earned := array_append(v_earned, 'hours_10'); end if;
  if v_minutes >= 3000 then v_earned := array_append(v_earned, 'hours_50'); end if;
  if v_streak >= 5 then v_earned := array_append(v_earned, 'streak_5'); end if;
  if v_extreme then v_earned := array_append(v_earned, 'extreme_done'); end if;

  for v_new in
    insert into public.user_achievements (user_id, achievement_id, org_id)
    select p_user_id, a.id, p_org_id from public.achievements a where a.code = any (v_earned)
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id
  loop
    perform private.notify(p_user_id, p_org_id, 'achievement_unlocked',
      jsonb_build_object('achievement_id', v_new.achievement_id,
                         'code', (select code from public.achievements where id = v_new.achievement_id)));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Начисление при подтверждении часов
-- -------------------------------------------------------------------------------------
create function private.award_for_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quest public.quests;
  v_points integer;
begin
  select * into v_quest from public.quests where id = new.quest_id;
  v_points := private.quest_points(v_quest.difficulty, new.confirmed_minutes,
                private.overall_rating(new.rating_quality, new.rating_activity, new.rating_teamwork));

  if v_points > 0 then
    insert into public.points_ledger (user_id, org_id, quest_id, confirmation_id, points, reason)
    values (new.user_id, new.org_id, new.quest_id, new.id, v_points, 'quest_completed');
    perform private.notify(new.user_id, new.org_id, 'points_awarded',
      jsonb_build_object('quest_id', new.quest_id, 'title', v_quest.title, 'points', v_points));
  end if;

  if new.confirmed_minutes > 0 then
    insert into public.user_skills (user_id, skill_id, xp)
    select new.user_id, qs.skill_id, qs.xp from public.quest_skills qs where qs.quest_id = new.quest_id
    on conflict (user_id, skill_id) do update set xp = public.user_skills.xp + excluded.xp;
  end if;

  perform private.evaluate_achievements(new.user_id, new.org_id);
  return null;
end;
$$;

create trigger award after insert on public.hour_confirmations
  for each row execute function private.award_for_confirmation();

-- -------------------------------------------------------------------------------------
-- «Моя выгода»
-- -------------------------------------------------------------------------------------

-- Начало текущей недели/месяца в поясе пользователя (из профиля).
create function private.period_start(p_period text, p_timezone text)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case p_period
    when 'week' then date_trunc('week', now() at time zone p_timezone) at time zone p_timezone
    when 'month' then date_trunc('month', now() at time zone p_timezone) at time zone p_timezone
    when 'year' then date_trunc('year', now() at time zone p_timezone) at time zone p_timezone
  end;
$$;

-- Подтверждённые часы за любой период — по дате проведения квеста.
create function public.my_hours(p_from timestamptz default null, p_to timestamptz default null)
returns table (minutes integer, quests integer)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(c.confirmed_minutes), 0)::integer, count(*) filter (where c.confirmed_minutes > 0)::integer
  from public.hour_confirmations c
  join public.quests q on q.id = c.quest_id
  where c.user_id = auth.uid()
    and (p_from is null or q.starts_at >= p_from)
    and (p_to is null or q.starts_at < p_to);
$$;

create function public.my_benefit()
returns table (
  total_minutes integer, week_minutes integer, month_minutes integer,
  total_points integer, quests_count integer, avg_rating numeric,
  level_code text, level_min_points integer, next_level_code text, next_level_min_points integer,
  skills jsonb, achievements jsonb, team_bags integer, team_area_m2 integer,
  hide_from_leaderboard boolean, timezone text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_profile public.profiles;
  v_points integer;
begin
  select * into v_profile from public.profiles where id = v_uid;
  select coalesce(sum(points), 0)::integer into v_points from public.points_ledger where user_id = v_uid;

  return query
  select
    (select h.minutes from public.my_hours() h),
    (select h.minutes from public.my_hours(private.period_start('week', v_profile.timezone)) h),
    (select h.minutes from public.my_hours(private.period_start('month', v_profile.timezone)) h),
    v_points,
    (select h.quests from public.my_hours() h),
    (select round(avg(private.overall_rating(c.rating_quality, c.rating_activity, c.rating_teamwork)), 2)
     from public.hour_confirmations c where c.user_id = v_uid and c.confirmed_minutes > 0),
    cur.code, cur.min_points, nxt.code, nxt.min_points,
    coalesce((select jsonb_agg(jsonb_build_object('code', s.code, 'name', s.name, 'xp', coalesce(us.xp, 0))
                               order by s.code)
              from public.skills s
              left join public.user_skills us on us.skill_id = s.id and us.user_id = v_uid), '[]'),
    coalesce((select jsonb_agg(jsonb_build_object('code', a.code, 'name', a.name, 'description', a.description,
                                                  'icon', a.icon, 'unlocked_at', ua.created_at)
                               order by ua.created_at nulls last, a.code)
              from public.achievements a
              left join public.user_achievements ua on ua.achievement_id = a.id and ua.user_id = v_uid), '[]'),
    -- Вклад команды в квестах, где человек подтверждённо работал.
    coalesce((select sum(q.bags_collected) from public.quests q
              where exists (select 1 from public.hour_confirmations c
                            where c.quest_id = q.id and c.user_id = v_uid and c.confirmed_minutes > 0)), 0)::integer,
    coalesce((select sum(q.area_m2) from public.quests q
              where exists (select 1 from public.hour_confirmations c
                            where c.quest_id = q.id and c.user_id = v_uid and c.confirmed_minutes > 0)), 0)::integer,
    v_profile.hide_from_leaderboard,
    v_profile.timezone
  from (select l.code, l.min_points from public.levels l where l.min_points <= v_points
        order by l.min_points desc limit 1) cur
  left join lateral (select l.code, l.min_points from public.levels l where l.min_points > v_points
                     order by l.min_points limit 1) nxt on true;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Рейтинг внутри организации
-- -------------------------------------------------------------------------------------
create function public.org_leaderboard(p_org_id uuid, p_period text default 'all')
returns table (place integer, user_id uuid, full_name text, points integer, minutes integer, is_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_from timestamptz;
begin
  if not private.is_org_member(p_org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if p_period not in ('all', 'month') then
    raise exception 'invalid_period' using errcode = 'P0001';
  end if;
  if p_period = 'month' then
    v_from := private.period_start('month', (select o.timezone from public.organizations o where o.id = p_org_id));
  end if;

  return query
  with scores as (
    select l.user_id, sum(l.points)::integer as points
    from public.points_ledger l
    where l.org_id = p_org_id and (v_from is null or l.created_at >= v_from)
    group by l.user_id
  ),
  visible as (
    -- Скрывшиеся в настройках в рейтинг не попадают; участники — только текущие.
    select s.user_id, s.points, p.full_name
    from scores s
    join public.profiles p on p.id = s.user_id
    join public.memberships m on m.user_id = s.user_id and m.org_id = p_org_id
    where s.points > 0 and not p.hide_from_leaderboard
  )
  select (rank() over (order by v.points desc))::integer, v.user_id, v.full_name, v.points,
         coalesce((select sum(c.confirmed_minutes) from public.hour_confirmations c
                   where c.user_id = v.user_id and c.org_id = p_org_id
                     and (v_from is null or c.confirmed_at >= v_from)), 0)::integer,
         v.user_id = v_uid
  from visible v
  order by v.points desc, v.full_name
  limit 100;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Вклад команды: координатор вносит после смены («убрали N мешков / N м²»)
-- -------------------------------------------------------------------------------------
create function public.set_quest_contribution(p_quest_id uuid, p_bags integer, p_area_m2 integer)
returns public.quests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quest public.quests := private.require_quest_manager(p_quest_id);
begin
  if v_quest.status not in ('in_progress', 'completed') then
    raise exception 'shift_not_active' using errcode = 'P0001';
  end if;
  if (p_bags is not null and p_bags not between 0 and 100000)
     or (p_area_m2 is not null and p_area_m2 not between 0 and 10000000) then
    raise exception 'invalid_contribution' using errcode = 'P0001';
  end if;
  update public.quests set bags_collected = p_bags, area_m2 = p_area_m2
  where id = p_quest_id returning * into v_quest;
  return v_quest;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Доступ
-- -------------------------------------------------------------------------------------
revoke execute on function
  private.overall_rating(smallint, smallint, smallint), private.quest_points(public.quest_difficulty, integer, smallint),
  private.attendance_streak(uuid), private.evaluate_achievements(uuid, uuid), private.award_for_confirmation(),
  private.period_start(text, text)
from public, anon, authenticated;

revoke execute on function
  public.my_hours(timestamptz, timestamptz), public.my_benefit(),
  public.org_leaderboard(uuid, text), public.set_quest_contribution(uuid, integer, integer)
from public, anon;
grant execute on function
  public.my_hours(timestamptz, timestamptz), public.my_benefit(),
  public.org_leaderboard(uuid, text), public.set_quest_contribution(uuid, integer, integer)
to authenticated;
