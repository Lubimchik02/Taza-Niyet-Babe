-- Рейтинг за месяц: баллы и часы относятся к одному моменту — подтверждению часов.
-- Раньше баллы брались по моменту записи в журнал, а часы — по подтверждению, и у часов,
-- подтверждённых в прошлом месяце, в рейтинге получалось «N баллов, 0 часов».
-- Записи журнала без подтверждения (компенсации по спорам, этап 8) — по своему моменту.
create or replace function public.org_leaderboard(p_org_id uuid, p_period text default 'all')
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
    left join public.hour_confirmations c on c.id = l.confirmation_id
    where l.org_id = p_org_id
      and (v_from is null or coalesce(c.confirmed_at, l.created_at) >= v_from)
    group by l.user_id
  ),
  visible as (
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
