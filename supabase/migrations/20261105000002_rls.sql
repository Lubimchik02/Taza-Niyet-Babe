-- =====================================================================================
-- Taza Niyet — права доступа (Row Level Security).
--
-- Принципы:
--  * RLS включён на КАЖДОЙ таблице public; anon не имеет доступа ни к одной таблице.
--  * Чтение — по членству в организации и роли.
--  * Запись в «доверенные» таблицы (запись на квест, смены, подтверждения, корректировки,
--    баллы, аудит, сертификаты, навыки/достижения пользователей) клиенту запрещена на уровне
--    привилегий. Она выполняется серверными функциями (security definer / Edge Functions),
--    которые проверяют бизнес-правила: лимит мест, QR, геолокацию, расчёт часов.
--  * Вспомогательные функции — в схеме private, она не публикуется через API.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Вспомогательные функции (security definer: читают memberships в обход RLS без рекурсии)
-- -------------------------------------------------------------------------------------
create function private.has_org_role(p_org_id uuid, p_roles public.org_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = p_org_id
      and m.user_id = (select auth.uid())
      and (p_roles is null or m.role = any (p_roles))
  );
$$;

create function private.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_role(p_org_id, null);
$$;

create function private.is_org_manager(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_role(p_org_id, array['admin', 'coordinator']::public.org_role[]);
$$;

create function private.is_org_admin(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_org_role(p_org_id, array['admin']::public.org_role[]);
$$;

-- Состоят ли текущий пользователь и p_user_id хотя бы в одной общей организации.
create function private.shares_org_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.org_id = mine.org_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
grant execute on function
  private.has_org_role(uuid, public.org_role[]),
  private.is_org_member(uuid),
  private.is_org_manager(uuid),
  private.is_org_admin(uuid),
  private.shares_org_with(uuid)
to authenticated, service_role;

-- -------------------------------------------------------------------------------------
-- Привилегии на уровне таблиц и колонок (вторая линия обороны после RLS)
-- -------------------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- Новые таблицы тоже не должны автоматически открываться anon.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon;

-- Только серверная запись.
revoke insert, update, delete on
  public.quest_signups,
  public.attendance_sessions,
  public.hour_confirmations,
  public.adjustments,
  public.points_ledger,
  public.audit_log,
  public.certificates,
  public.skills,
  public.achievements,
  public.user_skills,
  public.user_achievements
from authenticated;

-- Профиль: пользователь меняет только свои настройки.
revoke insert, update, delete on public.profiles from authenticated;
grant update (full_name, avatar_path, locale, timezone, hide_from_leaderboard) on public.profiles to authenticated;

-- Членство: меняется только роль (кто и куда — неизменно).
revoke update on public.memberships from authenticated;
grant update (role) on public.memberships to authenticated;

-- Спор: волонтёр создаёт, админ меняет только статус и решение.
revoke update on public.disputes from authenticated;
grant update (status, resolution) on public.disputes to authenticated;

-- Уведомление: пользователь может только отметить прочитанным.
revoke insert, update, delete on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- -------------------------------------------------------------------------------------
-- RLS на каждой таблице
-- -------------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.tasks enable row level security;
alter table public.quests enable row level security;
alter table public.skills enable row level security;
alter table public.quest_skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.quest_signups enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.hour_confirmations enable row level security;
alter table public.adjustments enable row level security;
alter table public.disputes enable row level security;
alter table public.points_ledger enable row level security;
alter table public.certificates enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;

-- profiles ---------------------------------------------------------------------------
-- profiles: свой и коллег по организациям
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.shares_org_with(id));

-- profiles: обновлять только свой
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- organizations ----------------------------------------------------------------------
-- organizations: видят участники
create policy organizations_select on public.organizations
  for select to authenticated
  using (private.is_org_member(id));

-- Создатель автоматически становится админом (триггер add_creator_as_admin).
-- organizations: создать от своего имени
create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (created_by = (select auth.uid()));

-- organizations: изменяет админ
create policy organizations_update on public.organizations
  for update to authenticated
  using (private.is_org_admin(id))
  with check (private.is_org_admin(id));

-- memberships ------------------------------------------------------------------------
-- memberships: видят участники организации
create policy memberships_select on public.memberships
  for select to authenticated
  using (private.is_org_member(org_id));

-- memberships: добавляет админ
create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (private.is_org_admin(org_id));

-- memberships: роль меняет админ
create policy memberships_update on public.memberships
  for update to authenticated
  using (private.is_org_admin(org_id))
  with check (private.is_org_admin(org_id));

-- memberships: админ исключает, участник выходит сам
create policy memberships_delete on public.memberships
  for delete to authenticated
  using (private.is_org_admin(org_id) or user_id = (select auth.uid()));

-- tasks (задачи «сверху» — рабочий инструмент админа и координаторов) -------------------
-- tasks: видят админ и координаторы
create policy tasks_select on public.tasks
  for select to authenticated
  using (private.is_org_manager(org_id));

-- tasks: создают админ и координаторы
create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (private.is_org_manager(org_id) and created_by = (select auth.uid()));

-- tasks: изменяют админ и координаторы
create policy tasks_update on public.tasks
  for update to authenticated
  using (private.is_org_manager(org_id))
  with check (private.is_org_manager(org_id));

-- tasks: удаляют админ и координаторы
create policy tasks_delete on public.tasks
  for delete to authenticated
  using (private.is_org_manager(org_id));

-- quests -----------------------------------------------------------------------------
-- quests: участники видят опубликованные, менеджеры — все
create policy quests_select on public.quests
  for select to authenticated
  using (
    private.is_org_manager(org_id)
    or (status <> 'draft' and private.is_org_member(org_id))
  );

-- quests: создают админ и координаторы
create policy quests_insert on public.quests
  for insert to authenticated
  with check (private.is_org_manager(org_id) and created_by = (select auth.uid()));

-- quests: изменяют админ и координаторы
create policy quests_update on public.quests
  for update to authenticated
  using (private.is_org_manager(org_id))
  with check (private.is_org_manager(org_id));

-- quests: удалить можно только черновик
create policy quests_delete on public.quests
  for delete to authenticated
  using (private.is_org_manager(org_id) and status = 'draft');

-- quest_skills -----------------------------------------------------------------------
-- quest_skills: видно вместе с квестом
create policy quest_skills_select on public.quest_skills
  for select to authenticated
  using (exists (select 1 from public.quests q where q.id = quest_id));

-- quest_skills: добавляют менеджеры
create policy quest_skills_insert on public.quest_skills
  for insert to authenticated
  with check (exists (
    select 1 from public.quests q where q.id = quest_id and private.is_org_manager(q.org_id)
  ));

-- quest_skills: изменяют менеджеры
create policy quest_skills_update on public.quest_skills
  for update to authenticated
  using (exists (
    select 1 from public.quests q where q.id = quest_id and private.is_org_manager(q.org_id)
  ))
  with check (exists (
    select 1 from public.quests q where q.id = quest_id and private.is_org_manager(q.org_id)
  ));

-- quest_skills: удаляют менеджеры
create policy quest_skills_delete on public.quest_skills
  for delete to authenticated
  using (exists (
    select 1 from public.quests q where q.id = quest_id and private.is_org_manager(q.org_id)
  ));

-- Справочники ------------------------------------------------------------------------
-- skills: справочник для всех вошедших
create policy skills_select on public.skills
  for select to authenticated using (true);

-- achievements: справочник для всех вошедших
create policy achievements_select on public.achievements
  for select to authenticated using (true);

-- Навыки и достижения пользователя ---------------------------------------------------
-- user_skills: свои и коллег
create policy user_skills_select on public.user_skills
  for select to authenticated
  using (user_id = (select auth.uid()) or private.shares_org_with(user_id));

-- user_achievements: свои и коллег
create policy user_achievements_select on public.user_achievements
  for select to authenticated
  using (user_id = (select auth.uid()) or private.shares_org_with(user_id));

-- Запись на квесты, смены, подтверждения: волонтёр видит своё, менеджеры — всё в организации.
-- quest_signups: свои или менеджер
create policy quest_signups_select on public.quest_signups
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_org_manager(org_id));

-- attendance_sessions: свои или менеджер
create policy attendance_sessions_select on public.attendance_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_org_manager(org_id));

-- hour_confirmations: свои или менеджер
create policy hour_confirmations_select on public.hour_confirmations
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_org_manager(org_id));

-- Волонтёр видит каждую правку своих часов — это часть прозрачности.
-- adjustments: правки своих часов или менеджер
create policy adjustments_select on public.adjustments
  for select to authenticated
  using (
    private.is_org_manager(org_id)
    or exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
    or exists (
      select 1 from public.hour_confirmations c
      where c.id = confirmation_id and c.user_id = (select auth.uid())
    )
  );

-- disputes ---------------------------------------------------------------------------
-- disputes: свои или админ
create policy disputes_select on public.disputes
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_org_admin(org_id));

-- user_id и org_id проставляет триггер из подтверждения, поэтому чужое подтверждение не пройдёт.
-- disputes: открыть по своему подтверждению
create policy disputes_insert on public.disputes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open');

-- disputes: рассматривает админ
create policy disputes_update on public.disputes
  for update to authenticated
  using (private.is_org_admin(org_id))
  with check (private.is_org_admin(org_id));

-- points_ledger ----------------------------------------------------------------------
-- points_ledger: свои или менеджер
create policy points_ledger_select on public.points_ledger
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_org_manager(org_id));

-- certificates (публичная проверка — отдельной функцией на этапе 7) ---------------------
-- certificates: свои или админ
create policy certificates_select on public.certificates
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_org_admin(org_id));

-- audit_log --------------------------------------------------------------------------
-- audit_log: читает админ организации
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (private.is_org_admin(org_id));

-- notifications ----------------------------------------------------------------------
-- notifications: только свои
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- notifications: отметить свои прочитанными
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
