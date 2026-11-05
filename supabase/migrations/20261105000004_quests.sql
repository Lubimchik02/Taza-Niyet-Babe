-- =====================================================================================
-- Этап 4: квесты — создание и редактирование, лента, карточка, запись и лист ожидания,
-- фото «до/после» в Storage.
--
-- Запись на квест и отмена — только через функции: они блокируют строку квеста
-- (SELECT … FOR UPDATE), поэтому одновременные записи не превышают лимит мест,
-- а освободившееся место сразу достаётся первому в листе ожидания.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Изменения схемы
-- -------------------------------------------------------------------------------------
alter table public.quests
  add column coordinator_contact text check (char_length(coordinator_contact) <= 200);
comment on column public.quests.coordinator_contact is 'Как связаться с координатором на месте: телефон, Telegram.';

-- Момент последней смены статуса записи — по нему строится очередь листа ожидания.
alter table public.quest_signups
  add column status_changed_at timestamptz not null default clock_timestamp();
update public.quest_signups set status_changed_at = created_at;
create index quest_signups_waitlist_idx
  on public.quest_signups (quest_id, status_changed_at, id) where status = 'waitlisted';

create function private.touch_signup_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    -- clock_timestamp(), а не now(): now() — начало транзакции, и при одновременных записях
    -- очередь шла бы не в порядке получения блокировки.
    new.status_changed_at := clock_timestamp();
    new.cancelled_at := case when new.status = 'cancelled' then now() end;
  end if;
  return new;
end;
$$;

create trigger touch_status before update of status on public.quest_signups
  for each row execute function private.touch_signup_status();

-- -------------------------------------------------------------------------------------
-- Вспомогательное
-- -------------------------------------------------------------------------------------
create function private.quest_taken(p_quest_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.quest_signups
  where quest_id = p_quest_id and status = 'signed_up';
$$;

-- Позиция в листе ожидания (1 — следующий), null — не в очереди.
create function private.waitlist_position(p_quest_id uuid, p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select pos::int from (
    select user_id, row_number() over (order by status_changed_at, id) as pos
    from public.quest_signups
    where quest_id = p_quest_id and status = 'waitlisted'
  ) q where q.user_id = p_user_id;
$$;

-- Переводит из листа ожидания столько людей, сколько освободилось мест.
create function private.promote_waitlist(p_quest_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quest public.quests;
  v_free integer;
  v_signup public.quest_signups;
begin
  select * into v_quest from public.quests where id = p_quest_id;
  if v_quest.status <> 'published' or v_quest.starts_at <= now() then
    return;
  end if;
  v_free := v_quest.capacity - private.quest_taken(p_quest_id);
  for v_signup in
    select * from public.quest_signups
    where quest_id = p_quest_id and status = 'waitlisted'
    order by status_changed_at, id
    limit greatest(v_free, 0)
    for update
  loop
    update public.quest_signups set status = 'signed_up' where id = v_signup.id;
    perform private.notify(v_signup.user_id, v_signup.org_id, 'waitlist_promoted',
      jsonb_build_object('quest_id', p_quest_id, 'title', v_quest.title));
  end loop;
end;
$$;

create function private.can_see_quest(p_quest public.quests)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_org_manager(p_quest.org_id)
      or (p_quest.status <> 'draft' and private.is_org_member(p_quest.org_id));
$$;

-- -------------------------------------------------------------------------------------
-- Лента и карточка
-- -------------------------------------------------------------------------------------

-- Квесты организаций пользователя с числом занятых мест и его статусом записи.
create function public.quest_feed(
  p_from timestamptz default now() - interval '12 hours',
  p_to timestamptz default null,
  p_org_id uuid default null
)
returns table (
  id uuid, org_id uuid, org_name text, title text, difficulty public.quest_difficulty,
  status public.quest_status, address text, lat double precision, lng double precision,
  starts_at timestamptz, ends_at timestamptz, capacity integer, taken integer, waitlisted integer,
  my_status public.signup_status, can_manage boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.org_id, o.name, q.title, q.difficulty, q.status, q.address, q.lat, q.lng,
         q.starts_at, q.ends_at, q.capacity,
         private.quest_taken(q.id),
         (select count(*)::int from public.quest_signups s where s.quest_id = q.id and s.status = 'waitlisted'),
         (select s.status from public.quest_signups s where s.quest_id = q.id and s.user_id = auth.uid()),
         private.is_org_manager(q.org_id)
  from public.quests q
  join public.organizations o on o.id = q.org_id
  where private.can_see_quest(q)
    and q.status <> 'cancelled'
    and q.ends_at >= p_from
    and (p_to is null or q.starts_at <= p_to)
    and (p_org_id is null or q.org_id = p_org_id)
  order by q.starts_at
  limit 200;
$$;

-- Всё для карточки квеста. Пусто, если квест не виден пользователю.
create function public.get_quest(p_quest_id uuid)
returns table (
  id uuid, org_id uuid, org_name text, title text, description text,
  difficulty public.quest_difficulty, status public.quest_status,
  address text, lat double precision, lng double precision, radius_m integer,
  starts_at timestamptz, ends_at timestamptz, capacity integer, cancel_deadline_hours integer,
  bring_items text[], provided_items text[], before_photo_path text, after_photo_path text,
  coordinator_id uuid, coordinator_name text, coordinator_contact text,
  skills jsonb, taken integer, waitlisted integer,
  my_status public.signup_status, my_waitlist_position integer, can_manage boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.org_id, o.name, q.title, q.description, q.difficulty, q.status,
         q.address, q.lat, q.lng, q.radius_m, q.starts_at, q.ends_at, q.capacity, q.cancel_deadline_hours,
         q.bring_items, q.provided_items, q.before_photo_path, q.after_photo_path,
         q.coordinator_id, p.full_name, q.coordinator_contact,
         coalesce((
           select jsonb_agg(jsonb_build_object('id', sk.id, 'code', sk.code, 'name', sk.name, 'xp', qs.xp)
                            order by sk.code)
           from public.quest_skills qs join public.skills sk on sk.id = qs.skill_id
           where qs.quest_id = q.id
         ), '[]'::jsonb),
         private.quest_taken(q.id),
         (select count(*)::int from public.quest_signups s where s.quest_id = q.id and s.status = 'waitlisted'),
         (select s.status from public.quest_signups s where s.quest_id = q.id and s.user_id = auth.uid()),
         private.waitlist_position(q.id, auth.uid()),
         private.is_org_manager(q.org_id)
  from public.quests q
  join public.organizations o on o.id = q.org_id
  left join public.profiles p on p.id = q.coordinator_id
  where q.id = p_quest_id and private.can_see_quest(q);
$$;

-- Участники квеста для координатора: записанные и очередь по порядку.
create function public.list_quest_participants(p_quest_id uuid)
returns table (user_id uuid, full_name text, status public.signup_status, queue_position integer, signed_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id, p.full_name, s.status,
         case when s.status = 'waitlisted'
              then (row_number() over (partition by s.status order by s.status_changed_at, s.id))::int end,
         s.status_changed_at
  from public.quest_signups s
  join public.profiles p on p.id = s.user_id
  join public.quests q on q.id = s.quest_id
  where s.quest_id = p_quest_id and s.status <> 'cancelled' and private.is_org_manager(q.org_id)
  order by s.status, s.status_changed_at, s.id;
$$;

-- Квесты, на которые записан пользователь (для «Мои квесты»).
create function public.my_quests()
returns table (
  id uuid, org_name text, title text, difficulty public.quest_difficulty, status public.quest_status,
  address text, starts_at timestamptz, ends_at timestamptz, capacity integer, taken integer,
  my_status public.signup_status, my_waitlist_position integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, o.name, q.title, q.difficulty, q.status, q.address, q.starts_at, q.ends_at, q.capacity,
         private.quest_taken(q.id), s.status, private.waitlist_position(q.id, s.user_id)
  from public.quest_signups s
  join public.quests q on q.id = s.quest_id
  join public.organizations o on o.id = q.org_id
  where s.user_id = auth.uid() and s.status <> 'cancelled'
  order by q.starts_at desc
  limit 200;
$$;

-- -------------------------------------------------------------------------------------
-- Запись и отмена
-- -------------------------------------------------------------------------------------
create function public.signup_for_quest(p_quest_id uuid)
returns public.quest_signups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_quest public.quests;
  v_signup public.quest_signups;
  v_status public.signup_status;
begin
  -- Блокировка квеста сериализует одновременные записи: лимит мест не превысить.
  select * into v_quest from public.quests where id = p_quest_id for update;
  if v_quest.id is null or not private.is_org_member(v_quest.org_id) or v_quest.status = 'draft' then
    raise exception 'quest_not_found' using errcode = 'P0001';
  end if;
  if v_quest.status <> 'published' or v_quest.starts_at <= now() then
    raise exception 'quest_closed' using errcode = 'P0001';
  end if;

  select * into v_signup from public.quest_signups
  where quest_id = p_quest_id and user_id = v_uid for update;
  if v_signup.id is not null and v_signup.status <> 'cancelled' then
    return v_signup; -- повторное нажатие ничего не меняет
  end if;

  v_status := case when private.quest_taken(p_quest_id) < v_quest.capacity
                   then 'signed_up' else 'waitlisted' end;

  if v_signup.id is null then
    insert into public.quest_signups (quest_id, user_id, status)
    values (p_quest_id, v_uid, v_status) returning * into v_signup;
  else
    update public.quest_signups set status = v_status where id = v_signup.id returning * into v_signup;
  end if;
  return v_signup;
end;
$$;

-- Отмена записи не позже чем за cancel_deadline_hours до начала; из очереди можно выйти всегда.
create function public.cancel_signup(p_quest_id uuid)
returns public.quest_signups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_quest public.quests;
  v_signup public.quest_signups;
begin
  select * into v_quest from public.quests where id = p_quest_id for update;
  select * into v_signup from public.quest_signups
  where quest_id = p_quest_id and user_id = v_uid for update;
  if v_quest.id is null or v_signup.id is null or v_signup.status = 'cancelled' then
    raise exception 'not_signed_up' using errcode = 'P0001';
  end if;
  if v_signup.status = 'signed_up'
     and now() > v_quest.starts_at - make_interval(hours => v_quest.cancel_deadline_hours) then
    raise exception 'cancel_too_late' using errcode = 'P0001';
  end if;

  update public.quest_signups set status = 'cancelled' where id = v_signup.id returning * into v_signup;
  if v_signup.status = 'cancelled' then
    perform private.promote_waitlist(p_quest_id);
  end if;
  return v_signup;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Создание и редактирование квеста (атомарно вместе с навыками)
-- -------------------------------------------------------------------------------------
create function public.save_quest(
  p_org_id uuid,
  p_data jsonb,
  p_skill_ids uuid[] default null,
  p_quest_id uuid default null -- null — создать новый квест
)
returns public.quests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_old public.quests;
  v_quest public.quests;
  v_status public.quest_status := coalesce(p_data ->> 'status', 'draft')::public.quest_status;
  v_signup record;
begin
  if not private.is_org_manager(p_org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  -- Ход и завершение квеста выставляет учёт часов (этап 5), а не форма.
  if v_status not in ('draft', 'published', 'cancelled') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;

  if p_quest_id is null then
    insert into public.quests (
      org_id, title, description, difficulty, status, address, lat, lng, radius_m,
      starts_at, ends_at, capacity, cancel_deadline_hours, coordinator_id, coordinator_contact,
      bring_items, provided_items, before_photo_path, created_by
    ) values (
      p_org_id, p_data ->> 'title', coalesce(p_data ->> 'description', ''),
      (p_data ->> 'difficulty')::public.quest_difficulty, v_status,
      p_data ->> 'address', (p_data ->> 'lat')::double precision, (p_data ->> 'lng')::double precision,
      coalesce((p_data ->> 'radius_m')::int, 300),
      (p_data ->> 'starts_at')::timestamptz, (p_data ->> 'ends_at')::timestamptz,
      (p_data ->> 'capacity')::int, coalesce((p_data ->> 'cancel_deadline_hours')::int, 12),
      coalesce((p_data ->> 'coordinator_id')::uuid, v_uid), nullif(p_data ->> 'coordinator_contact', ''),
      coalesce(array(select jsonb_array_elements_text(p_data -> 'bring_items')), '{}'),
      coalesce(array(select jsonb_array_elements_text(p_data -> 'provided_items')), '{}'),
      nullif(p_data ->> 'before_photo_path', ''), v_uid
    ) returning * into v_quest;
  else
    select * into v_old from public.quests where id = p_quest_id for update;
    if v_old.id is null or v_old.org_id <> p_org_id then
      raise exception 'quest_not_found' using errcode = 'P0001';
    end if;
    if v_old.status not in ('draft', 'published') then
      raise exception 'quest_locked' using errcode = 'P0001';
    end if;
    if v_old.status = 'published' and v_status = 'draft' then
      raise exception 'invalid_status' using errcode = 'P0001';
    end if;
    update public.quests set
      title = p_data ->> 'title',
      description = coalesce(p_data ->> 'description', ''),
      difficulty = (p_data ->> 'difficulty')::public.quest_difficulty,
      status = v_status,
      address = p_data ->> 'address',
      lat = (p_data ->> 'lat')::double precision,
      lng = (p_data ->> 'lng')::double precision,
      radius_m = coalesce((p_data ->> 'radius_m')::int, radius_m),
      starts_at = (p_data ->> 'starts_at')::timestamptz,
      ends_at = (p_data ->> 'ends_at')::timestamptz,
      capacity = (p_data ->> 'capacity')::int,
      cancel_deadline_hours = coalesce((p_data ->> 'cancel_deadline_hours')::int, cancel_deadline_hours),
      coordinator_id = coalesce((p_data ->> 'coordinator_id')::uuid, coordinator_id),
      coordinator_contact = nullif(p_data ->> 'coordinator_contact', ''),
      bring_items = coalesce(array(select jsonb_array_elements_text(p_data -> 'bring_items')), '{}'),
      provided_items = coalesce(array(select jsonb_array_elements_text(p_data -> 'provided_items')), '{}'),
      before_photo_path = case when p_data ? 'before_photo_path'
                               then nullif(p_data ->> 'before_photo_path', '') else before_photo_path end
    where id = p_quest_id
    returning * into v_quest;
  end if;

  -- Нельзя назначить мест меньше, чем уже записано: людям никто не скажет «вы больше не идёте».
  if v_quest.capacity < private.quest_taken(v_quest.id) then
    raise exception 'capacity_below_taken' using errcode = 'P0001';
  end if;

  delete from public.quest_skills where quest_id = v_quest.id
    and skill_id <> all (coalesce(p_skill_ids, '{}'));
  insert into public.quest_skills (quest_id, skill_id)
  select v_quest.id, unnest(coalesce(p_skill_ids, '{}'))
  on conflict (quest_id, skill_id) do nothing;

  if v_status = 'cancelled' and v_old.status is distinct from 'cancelled' then
    for v_signup in
      select user_id from public.quest_signups where quest_id = v_quest.id and status <> 'cancelled'
    loop
      perform private.notify(v_signup.user_id, v_quest.org_id, 'quest_cancelled',
        jsonb_build_object('quest_id', v_quest.id, 'title', v_quest.title));
    end loop;
  elsif v_status = 'published' then
    perform private.promote_waitlist(v_quest.id);
    if v_old.status is distinct from 'published' then
      for v_signup in
        select user_id from public.memberships where org_id = v_quest.org_id and user_id <> v_uid
      loop
        perform private.notify(v_signup.user_id, v_quest.org_id, 'new_quest',
          jsonb_build_object('quest_id', v_quest.id, 'title', v_quest.title));
      end loop;
    end if;
  end if;

  return v_quest;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Storage: фото квестов. Путь: <org_id>/<quest_id>/<файл>.
-- Читают участники организации, загружают и удаляют админ и координаторы.
-- -------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quest-photos', 'quest-photos', false, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create function private.org_from_path(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return (string_to_array(p_name, '/'))[1]::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create policy quest_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'quest-photos' and private.is_org_member(private.org_from_path(name)));

create policy quest_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'quest-photos' and private.is_org_manager(private.org_from_path(name)));

create policy quest_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'quest-photos' and private.is_org_manager(private.org_from_path(name)))
  with check (bucket_id = 'quest-photos' and private.is_org_manager(private.org_from_path(name)));

create policy quest_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'quest-photos' and private.is_org_manager(private.org_from_path(name)));

-- -------------------------------------------------------------------------------------
-- Доступ к функциям
-- -------------------------------------------------------------------------------------
revoke execute on function
  public.quest_feed(timestamptz, timestamptz, uuid),
  public.get_quest(uuid),
  public.list_quest_participants(uuid),
  public.my_quests(),
  public.signup_for_quest(uuid),
  public.cancel_signup(uuid),
  public.save_quest(uuid, jsonb, uuid[], uuid)
from public, anon;

grant execute on function
  public.quest_feed(timestamptz, timestamptz, uuid),
  public.get_quest(uuid),
  public.list_quest_participants(uuid),
  public.my_quests(),
  public.signup_for_quest(uuid),
  public.cancel_signup(uuid),
  public.save_quest(uuid, jsonb, uuid[], uuid)
to authenticated;

revoke execute on function
  private.quest_taken(uuid), private.waitlist_position(uuid, uuid), private.promote_waitlist(uuid),
  private.can_see_quest(public.quests), private.touch_signup_status()
from public, anon, authenticated;

-- Политики Storage вызывают эти функции от имени пользователя.
grant execute on function private.org_from_path(text) to authenticated;
