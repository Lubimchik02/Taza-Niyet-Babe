-- =====================================================================================
-- Этап 7: сертификаты.
--
-- Сертификат — неизменяемый снимок подтверждённых данных волонтёра в одной организации
-- на момент выпуска: ФИО, часы, квесты, средняя оценка, навыки. Подлинность проверяется
-- не по PDF (его можно подделать), а по QR → публичной странице verify/{id}, которая
-- берёт данные прямо из БД. id — UUID v4 (122 случайных бита), перебором не найти.
-- =====================================================================================

-- Выпуск сертификата волонтёром для себя.
create function public.issue_certificate(p_org_id uuid)
returns public.certificates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_name text;
  v_certificate public.certificates;
begin
  select btrim(full_name) into v_name from public.profiles where id = v_uid;
  if char_length(coalesce(v_name, '')) < 2 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.hour_confirmations
    where user_id = v_uid and org_id = p_org_id and confirmed_minutes > 0
  ) then
    raise exception 'no_confirmed_hours' using errcode = 'P0001';
  end if;

  with confirmed as (
    select c.*, q.title, q.starts_at, q.difficulty,
           private.overall_rating(c.rating_quality, c.rating_activity, c.rating_teamwork) as rating
    from public.hour_confirmations c
    join public.quests q on q.id = c.quest_id
    where c.user_id = v_uid and c.org_id = p_org_id and c.confirmed_minutes > 0
  )
  insert into public.certificates (user_id, org_id, full_name, total_minutes, quests_count, avg_rating, skills, quests)
  select
    v_uid, p_org_id, v_name,
    (select sum(confirmed_minutes) from confirmed)::integer,
    (select count(*) from confirmed)::integer,
    (select round(avg(rating), 2) from confirmed),
    coalesce((
      select jsonb_agg(jsonb_build_object('code', s.code, 'name', s.name, 'xp', x.xp) order by x.xp desc, s.code)
      from (select qs.skill_id, sum(qs.xp)::integer as xp
            from confirmed c join public.quest_skills qs on qs.quest_id = c.quest_id
            group by qs.skill_id) x
      join public.skills s on s.id = x.skill_id
    ), '[]'::jsonb),
    (select jsonb_agg(jsonb_build_object('title', title, 'date', starts_at, 'minutes', confirmed_minutes,
                                         'rating', rating, 'difficulty', difficulty) order by starts_at)
     from confirmed)
  returning * into v_certificate;

  return v_certificate;
end;
$$;

-- Публичная проверка — доступна без входа. Только то, что напечатано на сертификате.
create function public.verify_certificate(p_id uuid)
returns table (
  id uuid, full_name text, org_name text, total_minutes integer, quests_count integer,
  avg_rating numeric, skills jsonb, quests jsonb, issued_at timestamptz, revoked_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.full_name, o.name, c.total_minutes, c.quests_count, c.avg_rating,
         c.skills, c.quests, c.issued_at, c.revoked_at
  from public.certificates c
  join public.organizations o on o.id = c.org_id
  where c.id = p_id;
$$;

-- Отзыв (например, по итогам спора) — админ организации. Страница проверки покажет «отозван».
create function public.revoke_certificate(p_id uuid)
returns public.certificates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_certificate public.certificates;
begin
  perform private.require_user();
  select * into v_certificate from public.certificates where id = p_id for update;
  if v_certificate.id is null or not private.is_org_admin(v_certificate.org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  update public.certificates set revoked_at = coalesce(revoked_at, now())
  where id = p_id returning * into v_certificate;
  perform private.notify(v_certificate.user_id, v_certificate.org_id, 'certificate_revoked',
    jsonb_build_object('certificate_id', p_id));
  return v_certificate;
end;
$$;

revoke execute on function public.issue_certificate(uuid), public.revoke_certificate(uuid) from public, anon;
grant execute on function public.issue_certificate(uuid), public.revoke_certificate(uuid) to authenticated;

revoke execute on function public.verify_certificate(uuid) from public;
grant execute on function public.verify_certificate(uuid) to anon, authenticated;
