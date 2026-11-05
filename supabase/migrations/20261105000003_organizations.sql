-- =====================================================================================
-- Этап 3: организации и роли — приглашения, заявки на вступление, управление участниками.
--
-- Все действия, где важны бизнес-правила (срок и лимит приглашения, кто кого может пригласить,
-- последний админ), выполняются функциями public.* с security definer. Каждая функция сама
-- проверяет права вызывающего. Ошибки бросаются с кодом P0001 и машинным сообщением
-- (например 'invite_expired'), которое клиент переводит через i18n.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Таблицы
-- -------------------------------------------------------------------------------------
create type public.join_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  -- 96 случайных бит в base64url: код нельзя подобрать перебором.
  code text not null unique default translate(
    encode(extensions.gen_random_bytes(12), 'base64'), '+/', '-_'
  ) check (code ~ '^[A-Za-z0-9_-]{16}$'),
  role public.org_role not null default 'volunteer' check (role in ('volunteer', 'coordinator')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  expires_at timestamptz,
  max_uses integer check (max_uses between 1 and 10000),
  uses integer not null default 0 check (uses >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_uses is null or uses <= max_uses)
);
create index org_invites_org_idx on public.org_invites (org_id, created_at desc);
create index org_invites_created_by_idx on public.org_invites (created_by);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null default '' check (char_length(message) <= 500),
  status public.join_request_status not null default 'pending',
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('pending', 'cancelled')) = (decided_at is null))
);
-- Одна активная заявка на пользователя в организацию.
create unique index join_requests_one_pending
  on public.join_requests (org_id, user_id) where status = 'pending';
create index join_requests_org_status_idx on public.join_requests (org_id, status, created_at);
create index join_requests_user_idx on public.join_requests (user_id);
create index join_requests_decided_by_idx on public.join_requests (decided_by);

create trigger set_updated_at before update on public.org_invites
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.join_requests
  for each row execute function private.set_updated_at();
create trigger audit after insert or update or delete on public.org_invites
  for each row execute function private.audit_row();
create trigger audit after insert or update or delete on public.join_requests
  for each row execute function private.audit_row();
create trigger immutable_cols before update on public.org_invites
  for each row execute function private.keep_immutable('org_id', 'code', 'role', 'created_by');
create trigger immutable_cols before update on public.join_requests
  for each row execute function private.keep_immutable('org_id', 'user_id', 'message');

-- -------------------------------------------------------------------------------------
-- У организации всегда остаётся хотя бы один админ
-- -------------------------------------------------------------------------------------
create function private.keep_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and exists (select 1 from public.organizations o where o.id = old.org_id)
     and not exists (
       select 1 from public.memberships m
       where m.org_id = old.org_id and m.role = 'admin' and m.id <> old.id
     )
  then
    raise exception 'last_admin' using errcode = 'P0001',
      hint = 'Сначала назначьте другого администратора';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger keep_last_admin before update of role or delete on public.memberships
  for each row execute function private.keep_last_admin();

-- -------------------------------------------------------------------------------------
-- Права на новые таблицы
-- -------------------------------------------------------------------------------------
revoke all on public.org_invites, public.join_requests from anon;
revoke insert, update, delete, truncate, references, trigger on public.org_invites, public.join_requests
  from authenticated;

alter table public.org_invites enable row level security;
alter table public.join_requests enable row level security;

-- org_invites: приглашения видят те, кто может приглашать.
create policy org_invites_select on public.org_invites
  for select to authenticated
  using (private.is_org_manager(org_id));

-- join_requests: свои заявки или заявки в организацию, где ты менеджер.
create policy join_requests_select on public.join_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_org_manager(org_id));

-- -------------------------------------------------------------------------------------
-- Вспомогательное
-- -------------------------------------------------------------------------------------
create function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  return v_uid;
end;
$$;

create function private.notify(p_user_id uuid, p_org_id uuid, p_type text, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, org_id, type, payload)
  values (p_user_id, p_org_id, p_type, p_payload);
$$;

-- -------------------------------------------------------------------------------------
-- Организация
-- -------------------------------------------------------------------------------------

-- Создаёт организацию; создатель становится админом (триггер add_creator_as_admin).
create function public.create_organization(p_name text, p_slug text, p_description text default '')
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_org public.organizations;
begin
  if exists (select 1 from public.organizations where slug = lower(btrim(p_slug))) then
    raise exception 'slug_taken' using errcode = 'P0001';
  end if;
  insert into public.organizations (name, slug, description, created_by)
  values (btrim(p_name), lower(btrim(p_slug)), coalesce(btrim(p_description), ''), v_uid)
  returning * into v_org;
  return v_org;
end;
$$;

-- Публичный поиск для заявки на вступление: только название, адрес-слаг, описание и размер.
create function public.search_organizations(p_query text)
returns table (id uuid, name text, slug text, description text, members_count bigint, is_member boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.name, o.slug, o.description,
         (select count(*) from public.memberships m where m.org_id = o.id),
         exists (select 1 from public.memberships m where m.org_id = o.id and m.user_id = auth.uid())
  from public.organizations o
  where auth.uid() is not null
    and char_length(btrim(p_query)) >= 2
    and (o.name ilike '%' || btrim(p_query) || '%' or o.slug ilike '%' || btrim(p_query) || '%')
  order by o.name
  limit 20;
$$;

-- Участники организации с именами — для экрана управления.
create function public.list_org_members(p_org_id uuid)
returns table (membership_id uuid, user_id uuid, full_name text, role public.org_role, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.user_id, p.full_name, m.role, m.created_at
  from public.memberships m
  join public.profiles p on p.id = m.user_id
  where m.org_id = p_org_id
    and private.is_org_member(p_org_id)
  order by case m.role when 'admin' then 0 when 'coordinator' then 1 else 2 end, p.full_name;
$$;

-- Назначение ролей — только админ. Последнего админа понизить нельзя (триггер keep_last_admin).
create function public.set_member_role(p_membership_id uuid, p_role public.org_role)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_membership public.memberships;
begin
  select * into v_membership from public.memberships where id = p_membership_id for update;
  if v_membership.id is null or not private.is_org_admin(v_membership.org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_membership.role = p_role then
    return v_membership;
  end if;
  update public.memberships set role = p_role where id = p_membership_id returning * into v_membership;
  perform private.notify(v_membership.user_id, v_membership.org_id, 'role_changed',
    jsonb_build_object('role', p_role, 'by', v_uid));
  return v_membership;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Приглашения
-- -------------------------------------------------------------------------------------

-- Координатор приглашает волонтёров, админ — ещё и координаторов.
create function public.create_invite(
  p_org_id uuid,
  p_role public.org_role default 'volunteer',
  p_expires_in_hours integer default 168,
  p_max_uses integer default null
)
returns public.org_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_invite public.org_invites;
begin
  if not private.is_org_manager(p_org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if p_role = 'admin' then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;
  if p_role = 'coordinator' and not private.is_org_admin(p_org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if p_expires_in_hours is not null and p_expires_in_hours not between 1 and 24 * 90 then
    raise exception 'invalid_expiry' using errcode = 'P0001';
  end if;
  insert into public.org_invites (org_id, role, created_by, expires_at, max_uses)
  values (
    p_org_id, p_role, v_uid,
    case when p_expires_in_hours is null then null else now() + make_interval(hours => p_expires_in_hours) end,
    p_max_uses
  )
  returning * into v_invite;
  return v_invite;
end;
$$;

create function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.org_invites;
begin
  perform private.require_user();
  select * into v_invite from public.org_invites where id = p_invite_id;
  if v_invite.id is null or not private.is_org_manager(v_invite.org_id)
     or (v_invite.role = 'coordinator' and not private.is_org_admin(v_invite.org_id)) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  update public.org_invites set revoked_at = coalesce(revoked_at, now()) where id = p_invite_id;
end;
$$;

-- Причина, по которой приглашение нельзя использовать, или null.
create function private.invite_problem(p_invite public.org_invites)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_invite.id is null then 'invite_not_found'
    when p_invite.revoked_at is not null then 'invite_revoked'
    when p_invite.expires_at is not null and p_invite.expires_at <= now() then 'invite_expired'
    when p_invite.max_uses is not null and p_invite.uses >= p_invite.max_uses then 'invite_exhausted'
  end;
$$;

-- Что увидит человек, открыв ссылку, до того как вступить.
create function public.get_invite_preview(p_code text)
returns table (org_id uuid, org_name text, org_description text, role public.org_role,
               problem text, is_member boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_invite public.org_invites;
begin
  select * into v_invite from public.org_invites where code = p_code;
  if v_invite.id is null then
    return query select null::uuid, null::text, null::text, null::public.org_role, 'invite_not_found'::text, false;
    return;
  end if;
  return query
    select o.id, o.name, o.description, v_invite.role, private.invite_problem(v_invite),
           exists (select 1 from public.memberships m where m.org_id = o.id and m.user_id = v_uid)
    from public.organizations o where o.id = v_invite.org_id;
end;
$$;

-- Вступление по коду. Идемпотентно: повторное открытие ссылки участником ничего не ломает
-- и не тратит использование. Приглашение координатора повышает волонтёра до координатора.
create function public.accept_invite(p_code text)
returns public.memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_invite public.org_invites;
  v_problem text;
  v_membership public.memberships;
begin
  -- Блокировка строки: два одновременных вступления не превысят max_uses.
  select * into v_invite from public.org_invites where code = p_code for update;
  v_problem := private.invite_problem(v_invite);
  if v_problem is not null then
    raise exception '%', v_problem using errcode = 'P0001';
  end if;

  select * into v_membership from public.memberships
  where org_id = v_invite.org_id and user_id = v_uid for update;

  if v_membership.id is not null then
    if v_membership.role = 'volunteer' and v_invite.role = 'coordinator' then
      update public.memberships set role = 'coordinator' where id = v_membership.id
      returning * into v_membership;
      update public.org_invites set uses = uses + 1 where id = v_invite.id;
    end if;
    return v_membership;
  end if;

  insert into public.memberships (org_id, user_id, role)
  values (v_invite.org_id, v_uid, v_invite.role)
  returning * into v_membership;
  update public.org_invites set uses = uses + 1 where id = v_invite.id;

  -- Заявка в эту организацию больше не нужна.
  update public.join_requests set status = 'cancelled'
  where org_id = v_invite.org_id and user_id = v_uid and status = 'pending';

  return v_membership;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Заявки на вступление
-- -------------------------------------------------------------------------------------
create function public.request_to_join(p_org_id uuid, p_message text default '')
returns public.join_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_request public.join_requests;
begin
  if not exists (select 1 from public.organizations where id = p_org_id) then
    raise exception 'org_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.memberships where org_id = p_org_id and user_id = v_uid) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.join_requests where org_id = p_org_id and user_id = v_uid and status = 'pending') then
    raise exception 'request_exists' using errcode = 'P0001';
  end if;
  insert into public.join_requests (org_id, user_id, message)
  values (p_org_id, v_uid, coalesce(btrim(p_message), ''))
  returning * into v_request;
  return v_request;
end;
$$;

create function public.cancel_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  update public.join_requests set status = 'cancelled'
  where id = p_request_id and user_id = v_uid and status = 'pending';
  if not found then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
end;
$$;

-- Админ или координатор одобряет/отклоняет заявку. Одобренный вступает волонтёром.
create function public.decide_join_request(p_request_id uuid, p_approve boolean)
returns public.join_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_request public.join_requests;
begin
  select * into v_request from public.join_requests where id = p_request_id for update;
  if v_request.id is null or not private.is_org_manager(v_request.org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;

  update public.join_requests
  set status = case when p_approve then 'approved' else 'rejected' end::public.join_request_status,
      decided_by = v_uid,
      decided_at = now()
  where id = p_request_id
  returning * into v_request;

  if p_approve then
    insert into public.memberships (org_id, user_id, role)
    values (v_request.org_id, v_request.user_id, 'volunteer')
    on conflict (org_id, user_id) do nothing;
  end if;

  perform private.notify(v_request.user_id, v_request.org_id,
    case when p_approve then 'join_approved' else 'join_rejected' end,
    jsonb_build_object('request_id', v_request.id));
  return v_request;
end;
$$;

-- Заявки организации с именами заявителей.
create function public.list_join_requests(p_org_id uuid)
returns table (id uuid, user_id uuid, full_name text, message text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.user_id, p.full_name, r.message, r.created_at
  from public.join_requests r
  join public.profiles p on p.id = r.user_id
  where r.org_id = p_org_id and r.status = 'pending' and private.is_org_manager(p_org_id)
  order by r.created_at;
$$;

-- -------------------------------------------------------------------------------------
-- Доступ к функциям: только вошедшим пользователям
-- -------------------------------------------------------------------------------------
revoke execute on function
  public.create_organization(text, text, text),
  public.search_organizations(text),
  public.list_org_members(uuid),
  public.set_member_role(uuid, public.org_role),
  public.create_invite(uuid, public.org_role, integer, integer),
  public.revoke_invite(uuid),
  public.get_invite_preview(text),
  public.accept_invite(text),
  public.request_to_join(uuid, text),
  public.cancel_join_request(uuid),
  public.decide_join_request(uuid, boolean),
  public.list_join_requests(uuid)
from public, anon;

grant execute on function
  public.create_organization(text, text, text),
  public.search_organizations(text),
  public.list_org_members(uuid),
  public.set_member_role(uuid, public.org_role),
  public.create_invite(uuid, public.org_role, integer, integer),
  public.revoke_invite(uuid),
  public.get_invite_preview(text),
  public.accept_invite(text),
  public.request_to_join(uuid, text),
  public.cancel_join_request(uuid),
  public.decide_join_request(uuid, boolean),
  public.list_join_requests(uuid)
to authenticated;

revoke execute on function private.require_user(), private.notify(uuid, uuid, text, jsonb),
  private.invite_problem(public.org_invites), private.keep_last_admin()
from public, anon, authenticated;
