-- =====================================================================================
-- Taza Niyet — схема данных.
-- Все таблицы в public; служебные функции — в закрытой схеме private (не видна через API).
-- RLS-политики — в следующей миграции (20261105000002_rls.sql).
-- =====================================================================================

create schema if not exists private;
revoke all on schema private from public;

-- -------------------------------------------------------------------------------------
-- Перечисления
-- -------------------------------------------------------------------------------------
create type public.org_role as enum ('admin', 'coordinator', 'volunteer');
create type public.quest_difficulty as enum ('easy', 'medium', 'hard', 'extreme');
create type public.quest_status as enum ('draft', 'published', 'in_progress', 'completed', 'cancelled');
create type public.task_status as enum ('open', 'in_progress', 'done', 'cancelled');
create type public.signup_status as enum ('signed_up', 'waitlisted', 'cancelled');
create type public.attendance_method as enum ('qr', 'manual', 'auto');
create type public.attendance_status as enum ('active', 'closed', 'needs_confirmation', 'confirmed');
create type public.dispute_status as enum ('open', 'resolved', 'rejected');

-- -------------------------------------------------------------------------------------
-- Общие триггерные функции
-- -------------------------------------------------------------------------------------

-- updated_at всегда ставит сервер, а не клиент.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Журналы только на добавление: UPDATE/DELETE/TRUNCATE запрещены всем, включая владельца БД.
create function private.forbid_modification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Таблица %.% только для добавления: % запрещён', tg_table_schema, tg_table_name, tg_op
    using errcode = 'P0001';
end;
$$;

-- Колонки, переданные аргументами триггера, нельзя менять после вставки.
create function private.keep_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  col text;
begin
  foreach col in array tg_argv loop
    if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
      raise exception 'Колонку %.% нельзя изменить', tg_table_name, col using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$;

-- Часовой пояс должен быть валидным IANA-именем: иначе отчёты по периодам сломаются.
create function private.check_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Неизвестный часовой пояс: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Профили и организации
-- -------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  avatar_path text,
  locale text check (locale in ('kk', 'ru', 'en')),
  timezone text not null default 'Asia/Almaty',
  hide_from_leaderboard boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Публичная часть пользователя; создаётся триггером при регистрации.';

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  description text not null default '' check (char_length(description) <= 2000),
  logo_path text,
  timezone text not null default 'Asia/Almaty',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null default 'volunteer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index memberships_user_id_idx on public.memberships (user_id);
comment on table public.memberships is 'Роль пользователя в организации; у одного пользователя может быть много организаций.';

-- -------------------------------------------------------------------------------------
-- Задачи «сверху» и квесты
-- -------------------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 140),
  description text not null default '' check (char_length(description) <= 4000),
  address text,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  status public.task_status not null default 'open',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((lat is null) = (lng is null))
);
create index tasks_org_status_idx on public.tasks (org_id, status);
create index tasks_created_by_idx on public.tasks (created_by);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 3 and 140),
  description text not null default '' check (char_length(description) <= 4000),
  difficulty public.quest_difficulty not null,
  status public.quest_status not null default 'draft',
  address text not null check (char_length(btrim(address)) between 3 and 300),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  radius_m integer not null default 300 check (radius_m between 50 and 5000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity between 1 and 1000),
  cancel_deadline_hours integer not null default 12 check (cancel_deadline_hours between 0 and 168),
  coordinator_id uuid references public.profiles (id) on delete set null,
  bring_items text[] not null default '{}',
  provided_items text[] not null default '{}',
  before_photo_path text,
  after_photo_path text,
  -- Вклад группы («убрали N мешков / N м²»), вносит координатор.
  bags_collected integer check (bags_collected >= 0),
  area_m2 integer check (area_m2 >= 0),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '24 hours')
);
create index quests_org_status_starts_idx on public.quests (org_id, status, starts_at);
create index quests_coordinator_idx on public.quests (coordinator_id);
create index quests_task_idx on public.quests (task_id);
create index quests_created_by_idx on public.quests (created_by);
comment on column public.quests.ends_at is 'Плановое окончание; авто-закрытие смены — ends_at + 2 часа.';

-- Координатор квеста должен быть координатором/админом этой организации,
-- а задача «сверху» — принадлежать ей же.
create function private.check_quest_refs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.coordinator_id is not null and not exists (
    select 1 from public.memberships m
    where m.org_id = new.org_id
      and m.user_id = new.coordinator_id
      and m.role in ('admin', 'coordinator')
  ) then
    raise exception 'Пользователь % не координатор организации %', new.coordinator_id, new.org_id
      using errcode = '23514';
  end if;
  if new.task_id is not null and not exists (
    select 1 from public.tasks t where t.id = new.task_id and t.org_id = new.org_id
  ) then
    raise exception 'Задача % не принадлежит организации %', new.task_id, new.org_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Навыки и достижения
-- -------------------------------------------------------------------------------------
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z_]{1,40}$'),
  name jsonb not null check (name ? 'kk' and name ? 'ru' and name ? 'en'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quest_skills (
  quest_id uuid not null references public.quests (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete restrict,
  xp integer not null default 10 check (xp between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (quest_id, skill_id)
);
create index quest_skills_skill_idx on public.quest_skills (skill_id);

create table public.user_skills (
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete restrict,
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);
create index user_skills_skill_idx on public.user_skills (skill_id);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{1,40}$'),
  name jsonb not null check (name ? 'kk' and name ? 'ru' and name ? 'en'),
  description jsonb not null check (description ? 'kk' and description ? 'ru' and description ? 'en'),
  icon text not null default 'ribbon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete restrict,
  org_id uuid references public.organizations (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
create index user_achievements_achievement_idx on public.user_achievements (achievement_id);
create index user_achievements_org_idx on public.user_achievements (org_id);

-- -------------------------------------------------------------------------------------
-- Запись на квесты и учёт часов
-- -------------------------------------------------------------------------------------

-- org_id в дочерних таблицах денормализован для быстрых RLS-проверок и всегда берётся из квеста.
create function private.fill_org_from_quest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select q.org_id into new.org_id from public.quests q where q.id = new.quest_id;
  if new.org_id is null then
    raise exception 'Квест % не найден', new.quest_id using errcode = '23503';
  end if;
  return new;
end;
$$;

create table public.quest_signups (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.signup_status not null default 'signed_up',
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quest_id, user_id),
  check ((status = 'cancelled') = (cancelled_at is not null))
);
create index quest_signups_quest_status_idx on public.quest_signups (quest_id, status, created_at);
create index quest_signups_user_status_idx on public.quest_signups (user_id, status);
create index quest_signups_org_idx on public.quest_signups (org_id);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.attendance_status not null default 'active',
  check_in_at timestamptz not null,
  check_out_at timestamptz,
  check_in_method public.attendance_method not null,
  check_out_method public.attendance_method,
  check_in_lat double precision check (check_in_lat between -90 and 90),
  check_in_lng double precision check (check_in_lng between -180 and 180),
  check_out_lat double precision check (check_out_lat between -90 and 90),
  check_out_lng double precision check (check_out_lng between -180 and 180),
  offline boolean not null default false,
  -- Идентификатор события с устройства: повторная синхронизация офлайн-очереди не создаёт дублей.
  client_event_id uuid unique,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out_at is null or check_out_at > check_in_at),
  check ((check_out_at is null) = (check_out_method is null)),
  check ((status = 'active') = (check_out_at is null))
);
-- Нельзя иметь два активных check-in одновременно.
create unique index attendance_one_active_per_user
  on public.attendance_sessions (user_id) where check_out_at is null;
create index attendance_quest_idx on public.attendance_sessions (quest_id);
create index attendance_user_check_in_idx on public.attendance_sessions (user_id, check_in_at desc);
create index attendance_org_idx on public.attendance_sessions (org_id);
create index attendance_recorded_by_idx on public.attendance_sessions (recorded_by);

create table public.hour_confirmations (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests (id) on delete restrict,
  org_id uuid not null references public.organizations (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  -- Округление до 15 минут в пользу волонтёра делает сервер; здесь — гарантия формата.
  confirmed_minutes integer not null check (confirmed_minutes between 0 and 1440 and confirmed_minutes % 15 = 0),
  rating_quality smallint not null check (rating_quality between 1 and 5),
  rating_activity smallint not null check (rating_activity between 1 and 5),
  rating_teamwork smallint not null check (rating_teamwork between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  confirmed_by uuid references public.profiles (id) on delete set null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quest_id, user_id)
);
create index hour_confirmations_user_idx on public.hour_confirmations (user_id, confirmed_at desc);
create index hour_confirmations_org_idx on public.hour_confirmations (org_id, confirmed_at);
create index hour_confirmations_confirmed_by_idx on public.hour_confirmations (confirmed_by);

create table public.adjustments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete restrict,
  session_id uuid references public.attendance_sessions (id) on delete restrict,
  confirmation_id uuid references public.hour_confirmations (id) on delete restrict,
  field text not null check (field in ('check_in_at', 'check_out_at', 'confirmed_minutes')),
  old_value text,
  new_value text not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  adjusted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(session_id, confirmation_id) = 1)
);
create index adjustments_session_idx on public.adjustments (session_id);
create index adjustments_confirmation_idx on public.adjustments (confirmation_id);
create index adjustments_org_idx on public.adjustments (org_id, created_at desc);
create index adjustments_adjusted_by_idx on public.adjustments (adjusted_by);
comment on table public.adjustments is 'История правок часов с причиной. Только добавление.';

create function private.fill_adjustment_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.session_id is not null then
    select s.org_id into new.org_id from public.attendance_sessions s where s.id = new.session_id;
  else
    select c.org_id into new.org_id from public.hour_confirmations c where c.id = new.confirmation_id;
  end if;
  if new.org_id is null then
    raise exception 'Не найдена смена или подтверждение для корректировки' using errcode = '23503';
  end if;
  return new;
end;
$$;

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  confirmation_id uuid not null references public.hour_confirmations (id) on delete restrict,
  org_id uuid not null references public.organizations (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  comment text not null check (char_length(btrim(comment)) between 3 and 2000),
  status public.dispute_status not null default 'open',
  resolution text check (char_length(resolution) <= 2000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'open') = (resolved_at is null))
);
-- По одному подтверждению — не больше одного открытого спора.
create unique index disputes_one_open_per_confirmation
  on public.disputes (confirmation_id) where status = 'open';
create index disputes_org_status_idx on public.disputes (org_id, status);
create index disputes_user_idx on public.disputes (user_id);
create index disputes_resolved_by_idx on public.disputes (resolved_by);

-- Спор открывается от имени владельца подтверждения; org_id и user_id берутся из подтверждения.
-- Решение фиксирует, кто и когда его принял.
create function private.prepare_dispute()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select c.org_id, c.user_id into new.org_id, new.user_id
    from public.hour_confirmations c where c.id = new.confirmation_id;
    if new.org_id is null then
      raise exception 'Подтверждение % не найдено', new.confirmation_id using errcode = '23503';
    end if;
    new.status := 'open';
    new.resolution := null;
    new.resolved_by := null;
    new.resolved_at := null;
  elsif new.status is distinct from old.status then
    if old.status <> 'open' then
      raise exception 'Спор уже закрыт' using errcode = 'P0001';
    end if;
    new.resolved_by := auth.uid();
    new.resolved_at := now();
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Баллы, сертификаты, аудит, уведомления
-- -------------------------------------------------------------------------------------
create table public.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete restrict,
  org_id uuid not null references public.organizations (id) on delete restrict,
  quest_id uuid references public.quests (id) on delete restrict,
  confirmation_id uuid references public.hour_confirmations (id) on delete restrict,
  points integer not null check (points <> 0),
  reason text not null check (char_length(btrim(reason)) between 2 and 200),
  created_at timestamptz not null default now()
);
create index points_ledger_user_idx on public.points_ledger (user_id, created_at);
create index points_ledger_org_idx on public.points_ledger (org_id, created_at);
create index points_ledger_quest_idx on public.points_ledger (quest_id);
create index points_ledger_confirmation_idx on public.points_ledger (confirmation_id);
comment on table public.points_ledger is 'Журнал баллов: только добавление, баланс = сумма. Исправления — компенсирующей записью.';

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  total_minutes integer not null check (total_minutes >= 0),
  quests_count integer not null check (quests_count >= 0),
  avg_rating numeric(3, 2) check (avg_rating between 1 and 5),
  skills jsonb not null default '[]',
  quests jsonb not null default '[]',
  pdf_path text,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index certificates_user_idx on public.certificates (user_id);
create index certificates_org_idx on public.certificates (org_id);
comment on column public.certificates.id is 'Идентификатор для публичной проверки verify/{id}.';

create table public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid references public.organizations (id) on delete restrict,
  -- Без внешнего ключа: запись аудита должна пережить удаление пользователя.
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_org_idx on public.audit_log (org_id, created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_actor_idx on public.audit_log (actor_id);
comment on table public.audit_log is 'Неизменяемый журнал: кто, что, когда, старое и новое значение.';

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete cascade,
  type text not null check (type ~ '^[a-z][a-z_]{1,40}$'),
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_org_idx on public.notifications (org_id);

-- Аудит изменений: пишется триггером, поэтому его нельзя «забыть» в коде.
create function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
begin
  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);
  insert into public.audit_log (org_id, actor_id, action, entity, entity_id, old_value, new_value)
  values (
    case when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid else (v_row ->> 'org_id')::uuid end,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    (v_row ->> 'id')::uuid,
    v_old,
    v_new
  );
  return null;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Профиль при регистрации и админ при создании организации
-- -------------------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'full_name', 120), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.add_org_creator_as_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.memberships (org_id, user_id, role) values (new.id, new.created_by, 'admin');
  end if;
  return new;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Подключение триггеров
-- -------------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'organizations', 'memberships', 'tasks', 'quests', 'skills', 'quest_skills',
    'user_skills', 'achievements', 'user_achievements', 'quest_signups', 'attendance_sessions',
    'hour_confirmations', 'disputes', 'certificates', 'notifications'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      t
    );
  end loop;

  foreach t in array array['points_ledger', 'audit_log', 'adjustments'] loop
    execute format(
      'create trigger append_only before update or delete on public.%I for each row execute function private.forbid_modification()',
      t
    );
    execute format(
      'create trigger append_only_truncate before truncate on public.%I for each statement execute function private.forbid_modification()',
      t
    );
  end loop;

  foreach t in array array[
    'organizations', 'memberships', 'tasks', 'quests', 'quest_signups', 'attendance_sessions',
    'hour_confirmations', 'disputes', 'certificates'
  ] loop
    execute format(
      'create trigger audit after insert or update or delete on public.%I for each row execute function private.audit_row()',
      t
    );
  end loop;

  foreach t in array array['quest_signups', 'attendance_sessions', 'hour_confirmations'] loop
    execute format(
      'create trigger fill_org before insert on public.%I for each row execute function private.fill_org_from_quest()',
      t
    );
  end loop;
end;
$$;

create trigger check_timezone before insert or update of timezone on public.profiles
  for each row execute function private.check_timezone();
create trigger check_timezone before insert or update of timezone on public.organizations
  for each row execute function private.check_timezone();

create trigger add_creator_as_admin after insert on public.organizations
  for each row execute function private.add_org_creator_as_admin();

create trigger check_refs before insert or update of org_id, coordinator_id, task_id on public.quests
  for each row execute function private.check_quest_refs();

create trigger fill_org before insert on public.adjustments
  for each row execute function private.fill_adjustment_org();

create trigger prepare_dispute before insert or update on public.disputes
  for each row execute function private.prepare_dispute();

-- Неизменяемые колонки: принадлежность записи организации/пользователю не меняется.
create trigger immutable_cols before update on public.organizations
  for each row execute function private.keep_immutable('created_by');
create trigger immutable_cols before update on public.memberships
  for each row execute function private.keep_immutable('org_id', 'user_id');
create trigger immutable_cols before update on public.tasks
  for each row execute function private.keep_immutable('org_id', 'created_by');
create trigger immutable_cols before update on public.quests
  for each row execute function private.keep_immutable('org_id', 'created_by');
create trigger immutable_cols before update on public.quest_signups
  for each row execute function private.keep_immutable('quest_id', 'org_id', 'user_id');
create trigger immutable_cols before update on public.attendance_sessions
  for each row execute function private.keep_immutable('quest_id', 'org_id', 'user_id', 'client_event_id');
create trigger immutable_cols before update on public.hour_confirmations
  for each row execute function private.keep_immutable('quest_id', 'org_id', 'user_id');
create trigger immutable_cols before update on public.disputes
  for each row execute function private.keep_immutable('confirmation_id', 'org_id', 'user_id', 'comment');
create trigger immutable_cols before update on public.certificates
  for each row execute function private.keep_immutable(
    'user_id', 'org_id', 'full_name', 'total_minutes', 'quests_count', 'avg_rating', 'skills', 'quests', 'issued_at'
  );
