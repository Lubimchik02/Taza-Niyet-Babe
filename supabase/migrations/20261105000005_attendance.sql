-- =====================================================================================
-- Этап 5: учёт часов — главное звено. Цель: часы нельзя накрутить и нельзя потерять.
--
--  * Динамический QR: токен «<quest_id>.<окно>.<подпись>», окно = 30 секунд,
--    подпись = HMAC-SHA256 секретом смены. Секрет живёт в private.shift_secrets
--    и никогда не покидает БД. Принимаются текущее и два предыдущих окна (до ~90 с на скан).
--  * Check-in проверяет: QR действителен и не просрочен, волонтёр записан, он в радиусе квеста,
--    у него нет другой активной смены. Всё — на сервере.
--  * Офлайн: координатор заранее получает пачку подписанных токенов на будущие окна;
--    волонтёр сохраняет отметку с временем устройства и синхронизирует позже. Повтор того же
--    события (client_event_id) не создаёт дубль. Конфликт — в пользу данных координатора.
--  * Часы считаются на сервере в UTC: сумма всех смен человека в квесте, округление вверх
--    до 15 минут (в пользу волонтёра). Часовой пояс сессии на результат не влияет.
--  * Любая правка — только с причиной: строки в adjustments (только добавление) + audit_log.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- Схема
-- -------------------------------------------------------------------------------------
create table private.shift_secrets (
  quest_id uuid primary key references public.quests (id) on delete cascade,
  secret bytea not null default extensions.gen_random_bytes(32),
  created_at timestamptz not null default now()
);
revoke all on private.shift_secrets from public, anon, authenticated;
comment on table private.shift_secrets is 'Секрет подписи QR смены. Недоступен клиентам.';

-- Идемпотентность офлайн-ухода (check-in уже защищён client_event_id).
alter table public.attendance_sessions add column check_out_event_id uuid unique;

-- Координатор видит присутствующих в реальном времени (RLS действует и для Realtime).
alter publication supabase_realtime add table public.attendance_sessions;

-- -------------------------------------------------------------------------------------
-- Константы и чистые функции
-- -------------------------------------------------------------------------------------
create function private.qr_window_seconds() returns integer language sql immutable as 'select 30';
create function private.qr_grace_windows() returns integer language sql immutable as 'select 2';

create function private.qr_window(p_at timestamptz)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select floor(extract(epoch from p_at) / private.qr_window_seconds())::bigint;
$$;

-- Расстояние по поверхности Земли (гаверсинус), метры. Та же формула, что в клиенте (geo.ts).
create function private.distance_m(lat1 double precision, lng1 double precision,
                                   lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 2 * 6371000 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )));
$$;

-- Округление вверх до 15 минут — в пользу волонтёра.
create function private.round_up_15(p_minutes numeric)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (ceil(greatest(p_minutes, 0) / 15) * 15)::integer;
$$;

-- Сырые минуты человека в квесте: сумма закрытых смен (точно, в секундах → минуты).
create function private.raw_minutes(p_quest_id uuid, p_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(extract(epoch from (s.check_out_at - s.check_in_at))) / 60, 0)
  from public.attendance_sessions s
  where s.quest_id = p_quest_id and s.user_id = p_user_id and s.check_out_at is not null;
$$;

-- -------------------------------------------------------------------------------------
-- QR: подпись и проверка
-- -------------------------------------------------------------------------------------
create function private.qr_sign(p_quest_id uuid, p_window bigint)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select left(encode(extensions.hmac(
           convert_to(p_quest_id::text || '.' || p_window::text, 'UTF8'), s.secret, 'sha256'), 'hex'), 32)
  from private.shift_secrets s
  where s.quest_id = p_quest_id;
$$;

create function private.qr_token(p_quest_id uuid, p_window bigint)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p_quest_id::text || '.' || p_window::text || '.' || private.qr_sign(p_quest_id, p_window);
$$;

-- Проверяет токен на момент p_at (сейчас или время устройства для офлайна). Возвращает квест.
create function private.qr_verify(p_token text, p_at timestamptz)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[] := string_to_array(btrim(coalesce(p_token, '')), '.');
  v_quest uuid;
  v_window bigint;
  v_expected text;
  v_now_window bigint := private.qr_window(p_at);
begin
  if array_length(v_parts, 1) <> 3 or v_parts[3] !~ '^[0-9a-f]{32}$' or v_parts[2] !~ '^[0-9]{1,15}$' then
    raise exception 'qr_invalid' using errcode = 'P0001';
  end if;
  begin
    v_quest := v_parts[1]::uuid;
  exception when invalid_text_representation then
    raise exception 'qr_invalid' using errcode = 'P0001';
  end;
  v_window := v_parts[2]::bigint;

  v_expected := private.qr_sign(v_quest, v_window);
  if v_expected is null then
    raise exception 'shift_not_started' using errcode = 'P0001';
  end if;
  if v_expected <> v_parts[3] then
    raise exception 'qr_invalid' using errcode = 'P0001';
  end if;
  -- +1 окно — допуск на расхождение часов устройства и сервера.
  if v_window > v_now_window + 1 or v_window < v_now_window - private.qr_grace_windows() then
    raise exception 'qr_expired' using errcode = 'P0001';
  end if;
  return v_quest;
end;
$$;

-- Время события: «сейчас» или время устройства (офлайн). Офлайн принимается в пределах суток
-- и не из будущего (допуск 5 минут на часы телефона).
create function private.event_time(p_device_time timestamptz)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
begin
  -- clock_timestamp(): реальный момент события, а не начало транзакции.
  if p_device_time is null then
    return clock_timestamp();
  end if;
  if p_device_time > clock_timestamp() + interval '5 minutes' then
    raise exception 'invalid_time' using errcode = 'P0001';
  end if;
  if p_device_time < now() - interval '24 hours' then
    raise exception 'offline_too_old' using errcode = 'P0001';
  end if;
  return p_device_time;
end;
$$;

-- Отметка возможна за час до начала и до двух часов после планового окончания.
create function private.require_shift_window(p_quest public.quests, p_at timestamptz)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_at < p_quest.starts_at - interval '1 hour' or p_at > p_quest.ends_at + interval '2 hours' then
    raise exception 'outside_shift' using errcode = 'P0001';
  end if;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Смена: старт, QR, завершение, автозакрытие
-- -------------------------------------------------------------------------------------
create function public.start_shift(p_quest_id uuid)
returns public.quests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_quest public.quests;
  v_signup record;
begin
  select * into v_quest from public.quests where id = p_quest_id for update;
  if v_quest.id is null or not private.is_org_manager(v_quest.org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_quest.status = 'in_progress' then
    return v_quest;
  end if;
  if v_quest.status <> 'published' then
    raise exception 'shift_not_active' using errcode = 'P0001';
  end if;
  if now() < v_quest.starts_at - interval '1 hour' then
    raise exception 'shift_too_early' using errcode = 'P0001';
  end if;
  if now() > v_quest.ends_at + interval '2 hours' then
    raise exception 'outside_shift' using errcode = 'P0001';
  end if;

  insert into private.shift_secrets (quest_id) values (p_quest_id) on conflict (quest_id) do nothing;
  update public.quests set status = 'in_progress' where id = p_quest_id returning * into v_quest;

  for v_signup in
    select user_id from public.quest_signups where quest_id = p_quest_id and status = 'signed_up'
  loop
    perform private.notify(v_signup.user_id, v_quest.org_id, 'shift_started',
      jsonb_build_object('quest_id', p_quest_id, 'title', v_quest.title, 'by', v_uid));
  end loop;
  return v_quest;
end;
$$;

-- QR для экрана координатора: токены на текущее и следующие окна (пачка — для работы офлайн).
create function public.get_shift_qr(p_quest_id uuid, p_windows integer default 1)
returns table (token text, valid_from timestamptz, valid_until timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quest public.quests;
  v_window bigint := private.qr_window(now());
  v_size integer := private.qr_window_seconds();
begin
  perform private.require_user();
  select * into v_quest from public.quests where id = p_quest_id;
  if v_quest.id is null or not private.is_org_manager(v_quest.org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_quest.status <> 'in_progress' then
    raise exception 'shift_not_active' using errcode = 'P0001';
  end if;
  -- Не больше 4 часов вперёд: утечка пачки с телефона координатора ограничена по времени.
  if p_windows not between 1 and 480 then
    raise exception 'invalid_windows' using errcode = 'P0001';
  end if;
  return query
    select private.qr_token(p_quest_id, w),
           to_timestamp(w * v_size),
           to_timestamp((w + 1) * v_size)
    from generate_series(v_window, v_window + p_windows - 1) as w;
end;
$$;

-- Закрывает смены, забытые после планового окончания + 2 часа: выход = плановое окончание,
-- метод «auto», статус «требует подтверждения». Квесты, чьё время вышло, завершаются.
create function private.auto_close_sessions(p_quest_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.attendance_sessions s
  set check_out_at = greatest(q.ends_at, s.check_in_at + interval '1 minute'),
      check_out_method = 'auto',
      status = 'needs_confirmation'
  from public.quests q
  where q.id = s.quest_id
    and s.check_out_at is null
    and now() > q.ends_at + interval '2 hours'
    and (p_quest_id is null or s.quest_id = p_quest_id);
  get diagnostics v_count = row_count;

  update public.quests
  set status = 'completed'
  where status = 'in_progress'
    and now() > ends_at + interval '2 hours'
    and (p_quest_id is null or id = p_quest_id);
  return v_count;
end;
$$;

-- «Завершить задание»: всех оставшихся координатор отмечает ушедшими сейчас.
create function public.finish_shift(p_quest_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_quest public.quests;
  v_count integer;
begin
  select * into v_quest from public.quests where id = p_quest_id for update;
  if v_quest.id is null or not private.is_org_manager(v_quest.org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_quest.status = 'completed' then
    return 0;
  end if;
  if v_quest.status <> 'in_progress' then
    raise exception 'shift_not_active' using errcode = 'P0001';
  end if;

  perform private.auto_close_sessions(p_quest_id);
  update public.attendance_sessions
  set check_out_at = greatest(clock_timestamp(), check_in_at + interval '1 minute'),
      check_out_method = 'manual',
      status = 'closed',
      recorded_by = v_uid
  where quest_id = p_quest_id and check_out_at is null;
  get diagnostics v_count = row_count;

  update public.quests set status = 'completed' where id = p_quest_id;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Отметки волонтёра (QR)
-- -------------------------------------------------------------------------------------
create function public.check_in(
  p_token text,
  p_lat double precision,
  p_lng double precision,
  p_client_event_id uuid,
  p_device_time timestamptz default null
)
returns public.attendance_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_session public.attendance_sessions;
  v_at timestamptz;
  v_quest public.quests;
  v_offline boolean := p_device_time is not null;
begin
  if p_client_event_id is null then
    raise exception 'invalid_event' using errcode = 'P0001';
  end if;
  -- Повтор того же события (повторная синхронизация) — вернуть уже созданную смену.
  select * into v_session from public.attendance_sessions where client_event_id = p_client_event_id;
  if v_session.id is not null then
    if v_session.user_id <> v_uid then
      raise exception 'invalid_event' using errcode = 'P0001';
    end if;
    return v_session;
  end if;

  v_at := private.event_time(p_device_time);
  select * into v_quest from public.quests where id = private.qr_verify(p_token, v_at) for update;

  -- Онлайн — только во время смены; офлайн-событие может прийти и после её завершения.
  if v_quest.status <> 'in_progress' and not (v_offline and v_quest.status = 'completed') then
    raise exception 'shift_not_active' using errcode = 'P0001';
  end if;
  perform private.require_shift_window(v_quest, v_at);

  if not exists (select 1 from public.quest_signups
                 where quest_id = v_quest.id and user_id = v_uid and status = 'signed_up') then
    raise exception 'not_signed_up' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.hour_confirmations where quest_id = v_quest.id and user_id = v_uid) then
    raise exception 'already_confirmed' using errcode = 'P0001';
  end if;

  if p_lat is null or p_lng is null then
    raise exception 'location_required' using errcode = 'P0001';
  end if;
  if private.distance_m(p_lat, p_lng, v_quest.lat, v_quest.lng) > v_quest.radius_m then
    raise exception 'too_far' using errcode = 'P0001';
  end if;

  -- Координатор уже отметил вручную — его данные главнее (офлайн-конфликт).
  select * into v_session from public.attendance_sessions
  where quest_id = v_quest.id and user_id = v_uid and check_in_method = 'manual'
  order by check_in_at desc limit 1;
  if v_session.id is not null then
    return v_session;
  end if;

  -- Момент входа внутри уже учтённой смены (офлайн-отметка «задним числом») — минуты
  -- посчитались бы дважды. Возвращаем ту смену, если она в этом квесте.
  select * into v_session from public.attendance_sessions
  where user_id = v_uid and check_out_at is not null
    and v_at >= check_in_at and v_at < check_out_at
  limit 1;
  if v_session.id is not null then
    if v_session.quest_id = v_quest.id then
      return v_session;
    end if;
    raise exception 'active_elsewhere' using errcode = 'P0001';
  end if;

  -- Уже на месте в этом квесте — повторный скан ничего не меняет.
  select * into v_session from public.attendance_sessions
  where user_id = v_uid and check_out_at is null;
  if v_session.id is not null then
    if v_session.quest_id = v_quest.id then
      return v_session;
    end if;
    raise exception 'active_elsewhere' using errcode = 'P0001';
  end if;

  insert into public.attendance_sessions (
    quest_id, user_id, status, check_in_at, check_in_method, check_in_lat, check_in_lng,
    offline, client_event_id, recorded_by
  ) values (
    v_quest.id, v_uid, 'active', v_at, 'qr', p_lat, p_lng, v_offline, p_client_event_id, v_uid
  ) returning * into v_session;
  return v_session;
end;
$$;

-- «Ушёл раньше» / уход по QR.
create function public.check_out(
  p_token text,
  p_lat double precision,
  p_lng double precision,
  p_client_event_id uuid,
  p_device_time timestamptz default null
)
returns public.attendance_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_session public.attendance_sessions;
  v_at timestamptz;
  v_quest_id uuid;
begin
  if p_client_event_id is null then
    raise exception 'invalid_event' using errcode = 'P0001';
  end if;
  select * into v_session from public.attendance_sessions where check_out_event_id = p_client_event_id;
  if v_session.id is not null then
    if v_session.user_id <> v_uid then
      raise exception 'invalid_event' using errcode = 'P0001';
    end if;
    return v_session;
  end if;

  v_at := private.event_time(p_device_time);
  v_quest_id := private.qr_verify(p_token, v_at);

  select * into v_session from public.attendance_sessions
  where quest_id = v_quest_id and user_id = v_uid and check_out_at is null
  for update;
  if v_session.id is null then
    -- Офлайн-уход пришёл позже: смену уже закрыл координатор — его данные главнее.
    select * into v_session from public.attendance_sessions
    where quest_id = v_quest_id and user_id = v_uid and check_out_method = 'manual'
    order by check_in_at desc limit 1;
    if p_device_time is not null and v_session.id is not null then
      return v_session;
    end if;
    raise exception 'not_checked_in' using errcode = 'P0001';
  end if;
  if v_at <= v_session.check_in_at then
    raise exception 'invalid_time' using errcode = 'P0001';
  end if;

  update public.attendance_sessions
  set check_out_at = v_at,
      check_out_method = 'qr',
      check_out_lat = p_lat,
      check_out_lng = p_lng,
      status = 'closed',
      offline = offline or p_device_time is not null,
      check_out_event_id = p_client_event_id
  where id = v_session.id
  returning * into v_session;
  return v_session;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Отметки координатора (без телефона у волонтёра или камера не работает)
-- -------------------------------------------------------------------------------------
create function private.require_quest_manager(p_quest_id uuid)
returns public.quests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quest public.quests;
begin
  perform private.require_user();
  select * into v_quest from public.quests where id = p_quest_id for update;
  if v_quest.id is null or not private.is_org_manager(v_quest.org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  return v_quest;
end;
$$;

create function public.manual_check_in(
  p_quest_id uuid,
  p_user_id uuid,
  p_client_event_id uuid default null,
  p_device_time timestamptz default null
)
returns public.attendance_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_quest public.quests := private.require_quest_manager(p_quest_id);
  v_session public.attendance_sessions;
  v_at timestamptz;
begin
  if p_client_event_id is not null then
    select * into v_session from public.attendance_sessions where client_event_id = p_client_event_id;
    if v_session.id is not null then
      return v_session;
    end if;
  end if;
  v_at := private.event_time(p_device_time);
  if v_quest.status <> 'in_progress' and not (p_device_time is not null and v_quest.status = 'completed') then
    raise exception 'shift_not_active' using errcode = 'P0001';
  end if;
  perform private.require_shift_window(v_quest, v_at);
  if not exists (select 1 from public.memberships where org_id = v_quest.org_id and user_id = p_user_id) then
    raise exception 'not_member' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.hour_confirmations where quest_id = p_quest_id and user_id = p_user_id) then
    raise exception 'already_confirmed' using errcode = 'P0001';
  end if;

  select * into v_session from public.attendance_sessions where user_id = p_user_id and check_out_at is null;
  if v_session.id is not null then
    if v_session.quest_id = p_quest_id then
      return v_session;
    end if;
    raise exception 'active_elsewhere' using errcode = 'P0001';
  end if;

  -- Пришёл без записи — координатор вправе добавить его на месте.
  insert into public.quest_signups (quest_id, user_id, status)
  values (p_quest_id, p_user_id, 'signed_up')
  on conflict (quest_id, user_id) do update set status = 'signed_up'
  where public.quest_signups.status <> 'signed_up';

  insert into public.attendance_sessions (
    quest_id, user_id, status, check_in_at, check_in_method, offline, client_event_id, recorded_by
  ) values (
    p_quest_id, p_user_id, 'active', v_at, 'manual', p_device_time is not null, p_client_event_id, v_uid
  ) returning * into v_session;
  return v_session;
end;
$$;

create function public.manual_check_out(
  p_quest_id uuid,
  p_user_id uuid,
  p_client_event_id uuid default null,
  p_device_time timestamptz default null
)
returns public.attendance_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_quest public.quests := private.require_quest_manager(p_quest_id);
  v_session public.attendance_sessions;
  v_at timestamptz;
begin
  if p_client_event_id is not null then
    select * into v_session from public.attendance_sessions where check_out_event_id = p_client_event_id;
    if v_session.id is not null then
      return v_session;
    end if;
  end if;
  v_at := private.event_time(p_device_time);
  if exists (select 1 from public.hour_confirmations where quest_id = p_quest_id and user_id = p_user_id) then
    raise exception 'already_confirmed' using errcode = 'P0001';
  end if;

  select * into v_session from public.attendance_sessions
  where quest_id = p_quest_id and user_id = p_user_id and check_out_at is null
  for update;

  if v_session.id is null then
    -- Волонтёр уже ушёл по QR (например, его офлайн-событие пришло раньше).
    -- Конфликт решается в пользу координатора: его время выхода заменяет, с причиной в журнале.
    select * into v_session from public.attendance_sessions
    where quest_id = p_quest_id and user_id = p_user_id
    order by check_in_at desc limit 1
    for update;
    if v_session.id is null then
      raise exception 'not_checked_in' using errcode = 'P0001';
    end if;
    if v_session.check_out_at is distinct from v_at and v_at > v_session.check_in_at then
      insert into public.adjustments (session_id, field, old_value, new_value, reason, adjusted_by)
      values (v_session.id, 'check_out_at', v_session.check_out_at::text, v_at::text,
              'Отметка координатора (конфликт синхронизации)', v_uid);
      update public.attendance_sessions
      set check_out_at = v_at, check_out_method = 'manual', recorded_by = v_uid,
          check_out_event_id = coalesce(p_client_event_id, check_out_event_id)
      where id = v_session.id
      returning * into v_session;
    end if;
    return v_session;
  end if;

  if v_at <= v_session.check_in_at then
    raise exception 'invalid_time' using errcode = 'P0001';
  end if;
  update public.attendance_sessions
  set check_out_at = v_at, check_out_method = 'manual', status = 'closed', recorded_by = v_uid,
      check_out_event_id = p_client_event_id
  where id = v_session.id
  returning * into v_session;
  return v_session;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Таблица смены и подтверждение
-- -------------------------------------------------------------------------------------

-- Для экрана смены и подтверждения: по каждому записанному или отметившемуся —
-- смены, рассчитанные сервером минуты и отметки «вручную/авто/офлайн».
create function public.shift_summary(p_quest_id uuid)
returns table (
  user_id uuid, full_name text, signed_up boolean, present boolean,
  first_check_in timestamptz, last_check_out timestamptz,
  raw_minutes numeric, rounded_minutes integer,
  methods text[], offline boolean, needs_confirmation boolean,
  sessions jsonb, confirmation jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quest public.quests;
begin
  perform private.require_user();
  select * into v_quest from public.quests where id = p_quest_id;
  if v_quest.id is null or not private.is_org_manager(v_quest.org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  perform private.auto_close_sessions(p_quest_id);

  return query
  with people as (
    select s.user_id from public.quest_signups s where s.quest_id = p_quest_id and s.status = 'signed_up'
    union
    select a.user_id from public.attendance_sessions a where a.quest_id = p_quest_id
  )
  select p.user_id, pr.full_name,
         exists (select 1 from public.quest_signups s
                 where s.quest_id = p_quest_id and s.user_id = p.user_id and s.status = 'signed_up'),
         exists (select 1 from public.attendance_sessions a
                 where a.quest_id = p_quest_id and a.user_id = p.user_id and a.check_out_at is null),
         (select min(a.check_in_at) from public.attendance_sessions a where a.quest_id = p_quest_id and a.user_id = p.user_id),
         (select max(a.check_out_at) from public.attendance_sessions a where a.quest_id = p_quest_id and a.user_id = p.user_id),
         round(private.raw_minutes(p_quest_id, p.user_id), 2),
         private.round_up_15(private.raw_minutes(p_quest_id, p.user_id)),
         coalesce((select array_agg(distinct m) from public.attendance_sessions a,
                   lateral unnest(array[a.check_in_method::text, a.check_out_method::text]) m
                   where a.quest_id = p_quest_id and a.user_id = p.user_id and m is not null), '{}'),
         coalesce((select bool_or(a.offline) from public.attendance_sessions a
                   where a.quest_id = p_quest_id and a.user_id = p.user_id), false),
         coalesce((select bool_or(a.status = 'needs_confirmation') from public.attendance_sessions a
                   where a.quest_id = p_quest_id and a.user_id = p.user_id), false),
         coalesce((select jsonb_agg(jsonb_build_object(
                     'id', a.id, 'check_in_at', a.check_in_at, 'check_out_at', a.check_out_at,
                     'check_in_method', a.check_in_method, 'check_out_method', a.check_out_method,
                     'status', a.status, 'offline', a.offline) order by a.check_in_at)
                   from public.attendance_sessions a where a.quest_id = p_quest_id and a.user_id = p.user_id), '[]'),
         (select to_jsonb(c) - 'org_id' from public.hour_confirmations c
          where c.quest_id = p_quest_id and c.user_id = p.user_id)
  from people p
  join public.profiles pr on pr.id = p.user_id
  order by pr.full_name;
end;
$$;

-- Правка времени смены координатором — только с причиной; старое и новое значение — в журнал.
create function public.adjust_session(
  p_session_id uuid,
  p_check_in_at timestamptz,
  p_check_out_at timestamptz,
  p_reason text
)
returns public.attendance_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_session public.attendance_sessions;
begin
  select * into v_session from public.attendance_sessions where id = p_session_id for update;
  if v_session.id is null or not private.is_org_manager(v_session.org_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.hour_confirmations
             where quest_id = v_session.quest_id and user_id = v_session.user_id) then
    raise exception 'already_confirmed' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_check_in_at is null or p_check_out_at is null or p_check_out_at <= p_check_in_at
     or p_check_out_at - p_check_in_at > interval '24 hours' then
    raise exception 'invalid_time' using errcode = 'P0001';
  end if;

  if p_check_in_at is distinct from v_session.check_in_at then
    insert into public.adjustments (session_id, field, old_value, new_value, reason, adjusted_by)
    values (p_session_id, 'check_in_at', v_session.check_in_at::text, p_check_in_at::text, btrim(p_reason), v_uid);
  end if;
  if p_check_out_at is distinct from v_session.check_out_at then
    insert into public.adjustments (session_id, field, old_value, new_value, reason, adjusted_by)
    values (p_session_id, 'check_out_at', v_session.check_out_at::text, p_check_out_at::text, btrim(p_reason), v_uid);
  end if;

  update public.attendance_sessions
  set check_in_at = p_check_in_at,
      check_out_at = p_check_out_at,
      check_out_method = coalesce(check_out_method, 'manual'),
      status = case when status = 'active' then 'closed' else status end,
      recorded_by = v_uid
  where id = p_session_id
  returning * into v_session;
  return v_session;
end;
$$;

-- Подтверждение часов и оценка. p_items: [{user_id, minutes?, reason?, rating_quality,
-- rating_activity, rating_teamwork, comment}]. Минуты по умолчанию — рассчитанные сервером;
-- если координатор ставит другие — причина обязательна и попадает в журнал корректировок.
create function public.confirm_hours(p_quest_id uuid, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_quest public.quests := private.require_quest_manager(p_quest_id);
  v_item jsonb;
  v_user uuid;
  v_computed integer;
  v_minutes integer;
  v_reason text;
  v_confirmation public.hour_confirmations;
  v_count integer := 0;
begin
  perform private.auto_close_sessions(p_quest_id);
  select * into v_quest from public.quests where id = p_quest_id;
  if v_quest.status <> 'completed' then
    raise exception 'shift_not_finished' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_user := (v_item ->> 'user_id')::uuid;
    if not exists (select 1 from public.attendance_sessions where quest_id = p_quest_id and user_id = v_user) then
      raise exception 'not_checked_in' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.hour_confirmations where quest_id = p_quest_id and user_id = v_user) then
      raise exception 'already_confirmed' using errcode = 'P0001';
    end if;

    v_computed := private.round_up_15(private.raw_minutes(p_quest_id, v_user));
    v_minutes := coalesce((v_item ->> 'minutes')::integer, v_computed);
    v_reason := btrim(coalesce(v_item ->> 'reason', ''));
    if v_minutes < 0 or v_minutes > 1440 or v_minutes % 15 <> 0 then
      raise exception 'invalid_minutes' using errcode = 'P0001';
    end if;
    if v_minutes <> v_computed and char_length(v_reason) < 3 then
      raise exception 'reason_required' using errcode = 'P0001';
    end if;

    insert into public.hour_confirmations (
      quest_id, user_id, confirmed_minutes, rating_quality, rating_activity, rating_teamwork,
      comment, confirmed_by
    ) values (
      p_quest_id, v_user, v_minutes,
      (v_item ->> 'rating_quality')::smallint, (v_item ->> 'rating_activity')::smallint,
      (v_item ->> 'rating_teamwork')::smallint, coalesce(btrim(v_item ->> 'comment'), ''), v_uid
    ) returning * into v_confirmation;

    if v_minutes <> v_computed then
      insert into public.adjustments (confirmation_id, field, old_value, new_value, reason, adjusted_by)
      values (v_confirmation.id, 'confirmed_minutes', v_computed::text, v_minutes::text, v_reason, v_uid);
    end if;

    update public.attendance_sessions set status = 'confirmed'
    where quest_id = p_quest_id and user_id = v_user;

    perform private.notify(v_user, v_quest.org_id, 'hours_confirmed',
      jsonb_build_object('quest_id', p_quest_id, 'title', v_quest.title, 'minutes', v_minutes));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Прозрачность для волонтёра
-- -------------------------------------------------------------------------------------
create function public.my_quest_attendance(p_quest_id uuid)
returns table (sessions jsonb, raw_minutes numeric, rounded_minutes integer, confirmation jsonb, adjustments jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select jsonb_agg(jsonb_build_object(
                'id', a.id, 'check_in_at', a.check_in_at, 'check_out_at', a.check_out_at,
                'check_in_method', a.check_in_method, 'check_out_method', a.check_out_method,
                'status', a.status, 'offline', a.offline) order by a.check_in_at)
              from public.attendance_sessions a where a.quest_id = p_quest_id and a.user_id = auth.uid()), '[]'),
    round(private.raw_minutes(p_quest_id, auth.uid()), 2),
    private.round_up_15(private.raw_minutes(p_quest_id, auth.uid())),
    (select to_jsonb(c) - 'org_id' || jsonb_build_object('confirmed_by_name', pr.full_name)
     from public.hour_confirmations c left join public.profiles pr on pr.id = c.confirmed_by
     where c.quest_id = p_quest_id and c.user_id = auth.uid()),
    coalesce((select jsonb_agg(jsonb_build_object(
                'field', ad.field, 'old_value', ad.old_value, 'new_value', ad.new_value,
                'reason', ad.reason, 'created_at', ad.created_at) order by ad.created_at)
              from public.adjustments ad
              left join public.attendance_sessions a on a.id = ad.session_id
              left join public.hour_confirmations c on c.id = ad.confirmation_id
              where (a.quest_id = p_quest_id and a.user_id = auth.uid())
                 or (c.quest_id = p_quest_id and c.user_id = auth.uid())), '[]')
  where auth.uid() is not null;
$$;

-- -------------------------------------------------------------------------------------
-- Автозакрытие по расписанию (каждые 5 минут)
-- -------------------------------------------------------------------------------------
create extension if not exists pg_cron;
select cron.schedule('auto-close-sessions', '*/5 * * * *', 'select private.auto_close_sessions()');

-- -------------------------------------------------------------------------------------
-- Доступ
-- -------------------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon;
grant execute on function private.org_from_path(text) to authenticated;
grant execute on function
  private.has_org_role(uuid, public.org_role[]), private.is_org_member(uuid),
  private.is_org_manager(uuid), private.is_org_admin(uuid), private.shares_org_with(uuid)
to authenticated;
revoke execute on function
  private.qr_sign(uuid, bigint), private.qr_token(uuid, bigint), private.qr_verify(text, timestamptz),
  private.raw_minutes(uuid, uuid), private.auto_close_sessions(uuid),
  private.require_quest_manager(uuid), private.event_time(timestamptz),
  private.require_shift_window(public.quests, timestamptz)
from authenticated;

revoke execute on function
  public.start_shift(uuid), public.get_shift_qr(uuid, integer), public.finish_shift(uuid),
  public.check_in(text, double precision, double precision, uuid, timestamptz),
  public.check_out(text, double precision, double precision, uuid, timestamptz),
  public.manual_check_in(uuid, uuid, uuid, timestamptz),
  public.manual_check_out(uuid, uuid, uuid, timestamptz),
  public.shift_summary(uuid), public.adjust_session(uuid, timestamptz, timestamptz, text),
  public.confirm_hours(uuid, jsonb), public.my_quest_attendance(uuid)
from public, anon;
grant execute on function
  public.start_shift(uuid), public.get_shift_qr(uuid, integer), public.finish_shift(uuid),
  public.check_in(text, double precision, double precision, uuid, timestamptz),
  public.check_out(text, double precision, double precision, uuid, timestamptz),
  public.manual_check_in(uuid, uuid, uuid, timestamptz),
  public.manual_check_out(uuid, uuid, uuid, timestamptz),
  public.shift_summary(uuid), public.adjust_session(uuid, timestamptz, timestamptz, text),
  public.confirm_hours(uuid, jsonb), public.my_quest_attendance(uuid)
to authenticated;
