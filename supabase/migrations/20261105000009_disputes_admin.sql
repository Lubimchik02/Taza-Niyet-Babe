-- =====================================================================================
-- Этап 8: споры, админ-панель, отчёты.
--
-- Спор: волонтёр не согласен с подтверждёнными часами → админ организации рассматривает.
-- Если админ меняет часы, это делается так же прозрачно, как любая правка: строка в adjustments
-- с причиной (= решение по спору), а баллы — компенсирующей записью в points_ledger
-- (прошлые записи не меняются, баланс = сумма).
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Споры
-- -------------------------------------------------------------------------------------
create function public.open_dispute(p_confirmation_id uuid, p_comment text)
returns public.disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_confirmation public.hour_confirmations;
  v_dispute public.disputes;
  v_admin record;
begin
  select * into v_confirmation from public.hour_confirmations where id = p_confirmation_id;
  if v_confirmation.id is null or v_confirmation.user_id <> v_uid then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_comment, ''))) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.disputes where confirmation_id = p_confirmation_id and status = 'open') then
    raise exception 'dispute_exists' using errcode = 'P0001';
  end if;

  insert into public.disputes (confirmation_id, comment) values (p_confirmation_id, btrim(p_comment))
  returning * into v_dispute;

  -- Спор рассматривает админ — он получает уведомление.
  for v_admin in
    select user_id from public.memberships where org_id = v_confirmation.org_id and role = 'admin'
  loop
    perform private.notify(v_admin.user_id, v_confirmation.org_id, 'dispute_opened',
      jsonb_build_object('dispute_id', v_dispute.id, 'quest_id', v_confirmation.quest_id));
  end loop;
  return v_dispute;
end;
$$;

-- Решение по спору. p_minutes — новые подтверждённые минуты (только при resolved; null — без изменения).
create function public.resolve_dispute(
  p_dispute_id uuid,
  p_status public.dispute_status,
  p_resolution text,
  p_minutes integer default null
)
returns public.disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_dispute public.disputes;
  v_confirmation public.hour_confirmations;
  v_quest public.quests;
  v_rating smallint;
  v_delta integer;
begin
  select * into v_dispute from public.disputes where id = p_dispute_id for update;
  if v_dispute.id is null or not private.is_org_admin(v_dispute.org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_dispute.status <> 'open' then
    raise exception 'dispute_closed' using errcode = 'P0001';
  end if;
  if p_status not in ('resolved', 'rejected') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_resolution, ''))) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_minutes is not null and p_status <> 'resolved' then
    raise exception 'invalid_minutes' using errcode = 'P0001';
  end if;

  select * into v_confirmation from public.hour_confirmations where id = v_dispute.confirmation_id for update;

  if p_minutes is not null and p_minutes <> v_confirmation.confirmed_minutes then
    if p_minutes < 0 or p_minutes > 1440 or p_minutes % 15 <> 0 then
      raise exception 'invalid_minutes' using errcode = 'P0001';
    end if;
    select * into v_quest from public.quests where id = v_confirmation.quest_id;
    v_rating := private.overall_rating(v_confirmation.rating_quality, v_confirmation.rating_activity,
                                       v_confirmation.rating_teamwork);
    v_delta := private.quest_points(v_quest.difficulty, p_minutes, v_rating)
             - private.quest_points(v_quest.difficulty, v_confirmation.confirmed_minutes, v_rating);

    insert into public.adjustments (confirmation_id, field, old_value, new_value, reason, adjusted_by)
    values (v_confirmation.id, 'confirmed_minutes', v_confirmation.confirmed_minutes::text, p_minutes::text,
            'Решение по спору: ' || btrim(p_resolution), v_uid);
    update public.hour_confirmations set confirmed_minutes = p_minutes where id = v_confirmation.id;

    -- Компенсирующая запись: история баллов не переписывается.
    if v_delta <> 0 then
      insert into public.points_ledger (user_id, org_id, quest_id, confirmation_id, points, reason)
      values (v_confirmation.user_id, v_confirmation.org_id, v_confirmation.quest_id, v_confirmation.id,
              v_delta, 'dispute_adjustment');
    end if;
    perform private.evaluate_achievements(v_confirmation.user_id, v_confirmation.org_id);
  end if;

  update public.disputes set status = p_status, resolution = btrim(p_resolution)
  where id = p_dispute_id returning * into v_dispute;

  perform private.notify(v_dispute.user_id, v_dispute.org_id, 'dispute_resolved',
    jsonb_build_object('dispute_id', v_dispute.id, 'status', p_status, 'minutes', p_minutes));
  return v_dispute;
end;
$$;

-- Споры организации для админа: кто, какой квест, сколько подтверждено, что пишет.
create function public.list_disputes(p_org_id uuid, p_status public.dispute_status default null)
returns table (
  id uuid, status public.dispute_status, comment text, resolution text, created_at timestamptz,
  resolved_at timestamptz, user_id uuid, full_name text, quest_id uuid, quest_title text,
  quest_starts_at timestamptz, confirmed_minutes integer, confirmed_by_name text, resolved_by_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.status, d.comment, d.resolution, d.created_at, d.resolved_at,
         d.user_id, p.full_name, q.id, q.title, q.starts_at, c.confirmed_minutes,
         cb.full_name, rb.full_name
  from public.disputes d
  join public.hour_confirmations c on c.id = d.confirmation_id
  join public.quests q on q.id = c.quest_id
  join public.profiles p on p.id = d.user_id
  left join public.profiles cb on cb.id = c.confirmed_by
  left join public.profiles rb on rb.id = d.resolved_by
  where d.org_id = p_org_id
    and private.is_org_admin(p_org_id)
    and (p_status is null or d.status = p_status)
  order by (d.status = 'open') desc, d.created_at desc
  limit 200;
$$;

-- -------------------------------------------------------------------------------------
-- Журнал аудита с именами
-- -------------------------------------------------------------------------------------
create function public.list_audit_log(p_org_id uuid, p_before bigint default null, p_limit integer default 50)
returns table (
  id bigint, created_at timestamptz, action text, entity text, entity_id uuid,
  actor_name text, old_value jsonb, new_value jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.created_at, a.action, a.entity, a.entity_id, p.full_name, a.old_value, a.new_value
  from public.audit_log a
  left join public.profiles p on p.id = a.actor_id
  where a.org_id = p_org_id
    and private.is_org_admin(p_org_id)
    and (p_before is null or a.id < p_before)
  order by a.id desc
  limit least(greatest(p_limit, 1), 200);
$$;

-- -------------------------------------------------------------------------------------
-- Отчёт по часам за период (для экспорта CSV/PDF)
-- -------------------------------------------------------------------------------------
create function public.hours_report(p_org_id uuid, p_from timestamptz, p_to timestamptz)
returns table (
  quest_date timestamptz, quest_title text, difficulty public.quest_difficulty,
  volunteer_id uuid, volunteer_name text, minutes integer,
  rating_quality smallint, rating_activity smallint, rating_teamwork smallint,
  points integer, confirmed_by_name text, confirmed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_org_admin(p_org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '3 years' then
    raise exception 'invalid_period' using errcode = 'P0001';
  end if;
  return query
  select q.starts_at, q.title, q.difficulty, c.user_id, p.full_name, c.confirmed_minutes,
         c.rating_quality, c.rating_activity, c.rating_teamwork,
         coalesce((select sum(l.points) from public.points_ledger l where l.confirmation_id = c.id), 0)::integer,
         cb.full_name, c.confirmed_at
  from public.hour_confirmations c
  join public.quests q on q.id = c.quest_id
  join public.profiles p on p.id = c.user_id
  left join public.profiles cb on cb.id = c.confirmed_by
  where c.org_id = p_org_id and q.starts_at >= p_from and q.starts_at < p_to
  order by q.starts_at, p.full_name;
end;
$$;

-- Сертификаты организации — для админа (отзыв).
create function public.list_org_certificates(p_org_id uuid)
returns table (id uuid, full_name text, total_minutes integer, issued_at timestamptz, revoked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.full_name, c.total_minutes, c.issued_at, c.revoked_at
  from public.certificates c
  where c.org_id = p_org_id and private.is_org_admin(p_org_id)
  order by c.issued_at desc
  limit 500;
$$;

-- -------------------------------------------------------------------------------------
-- Доступ
-- -------------------------------------------------------------------------------------
revoke execute on function
  public.open_dispute(uuid, text),
  public.resolve_dispute(uuid, public.dispute_status, text, integer),
  public.list_disputes(uuid, public.dispute_status),
  public.list_audit_log(uuid, bigint, integer),
  public.hours_report(uuid, timestamptz, timestamptz),
  public.list_org_certificates(uuid)
from public, anon;
grant execute on function
  public.open_dispute(uuid, text),
  public.resolve_dispute(uuid, public.dispute_status, text, integer),
  public.list_disputes(uuid, public.dispute_status),
  public.list_audit_log(uuid, bigint, integer),
  public.hours_report(uuid, timestamptz, timestamptz),
  public.list_org_certificates(uuid)
to authenticated;

-- Споры открываются только функцией open_dispute (она уведомляет админа и даёт понятные ошибки).
drop policy disputes_insert on public.disputes;
revoke insert on public.disputes from authenticated;
