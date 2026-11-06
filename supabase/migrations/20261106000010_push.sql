-- Этап 9: push-уведомления.
--
-- Источник уведомлений не меняется: бизнес-функции пишут строки в public.notifications
-- (private.notify). Здесь добавляется доставка на телефоны через Expo Push Service:
--
--   notifications (push_status = pending)
--     → private.push_tick() каждые 15 секунд (pg_cron):
--         1. разбирает ответы Expo на прошлые отправки (pg_net пишет их в net._http_response);
--         2. ставит напоминания за 24 ч и за 2 ч до квеста;
--         3. запрашивает квитанции доставки для билетов старше 15 минут;
--         4. отправляет новые уведомления пачками до 100 сообщений.
--
-- Отправка идёт из Postgres (pg_net), а не из Edge Function: базовый Expo Push API не требует
-- ключа, поэтому в базе не хранится ни одного секрета. Тексты пушей — в private.push_templates
-- на трёх языках; язык и часовой пояс берутся из профиля получателя.

create extension if not exists pg_net with schema extensions;

-- -------------------------------------------------------------------------------------
-- Типы уведомлений, которые уходят пушем. points_awarded не отправляется отдельно:
-- баллы входят в текст hours_confirmed (одно событие — один пуш).
-- -------------------------------------------------------------------------------------
create function private.push_types()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'new_quest', 'quest_cancelled', 'signup_confirmed', 'waitlist_promoted', 'quest_reminder',
    'shift_started', 'hours_confirmed', 'achievement_unlocked', 'dispute_resolved',
    'dispute_opened', 'join_approved', 'join_rejected', 'role_changed', 'certificate_revoked'
  ]::text[];
$$;

-- -------------------------------------------------------------------------------------
-- Токены устройств
-- -------------------------------------------------------------------------------------
create table public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);
comment on table public.push_tokens is
  'Expo push-токены устройств. Один токен — одно устройство; при входе другим аккаунтом переходит к нему.';

create trigger set_updated_at before update on public.push_tokens
  for each row execute function private.set_updated_at();

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon;
-- Запись — только через register/unregister: токен может принадлежать другому аккаунту на том же
-- телефоне, и переназначить его клиент сам не может (RLS не видит чужую строку).
revoke insert, update, delete on public.push_tokens from authenticated;

create policy push_tokens_select on public.push_tokens
  for select to authenticated
  using (user_id = (select auth.uid()));

-- -------------------------------------------------------------------------------------
-- Настройки: какие типы не присылать пушем (в ленте уведомлений они всё равно видны).
-- -------------------------------------------------------------------------------------
create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  muted_types text[] not null default '{}' check (muted_types <@ private.push_types()),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.notification_preferences is
  'Личные настройки push: типы, которые пользователь отключил.';

create trigger set_updated_at before update on public.notification_preferences
  for each row execute function private.set_updated_at();

alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from anon;
revoke all on public.notification_preferences from authenticated;
grant select on public.notification_preferences to authenticated;
grant insert (user_id, muted_types) on public.notification_preferences to authenticated;
-- user_id в списке, потому что upsert из supabase-js обновляет все переданные колонки;
-- подменить владельца не даст with check политики.
grant update (user_id, muted_types) on public.notification_preferences to authenticated;

create policy notification_preferences_select on public.notification_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_preferences_insert on public.notification_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notification_preferences_update on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- -------------------------------------------------------------------------------------
-- Состояние доставки у каждого уведомления.
-- Уже существующие строки помечаются skipped: при выкатке не рассылаем старые события.
-- -------------------------------------------------------------------------------------
alter table public.notifications
  add column push_status text not null default 'skipped'
    check (push_status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  add column push_attempts smallint not null default 0,
  add column pushed_at timestamptz;
alter table public.notifications alter column push_status set default 'pending';
create index notifications_push_pending_idx on public.notifications (created_at)
  where push_status = 'pending';

-- Уведомления появляются в ленте сразу, без перезагрузки.
alter publication supabase_realtime add table public.notifications;

-- -------------------------------------------------------------------------------------
-- Тексты пушей. Ключ — тип или «тип:вариант» (вариант берётся из payload, см. push_key).
-- Плейсхолдеры: {{title}} квест, {{when}} начало квеста в поясе получателя, {{duration}},
-- {{points}}, {{achievement}}, {{org}}.
-- -------------------------------------------------------------------------------------
create table private.push_templates (
  key text not null,
  locale text not null check (locale in ('kk', 'ru', 'en')),
  title text not null,
  body text not null,
  primary key (key, locale)
);

insert into private.push_templates (key, locale, title, body) values
  ('new_quest', 'ru', 'Новый квест', '{{title}} — {{when}}'),
  ('new_quest', 'kk', 'Жаңа квест', '{{title}} — {{when}}'),
  ('new_quest', 'en', 'New quest', '{{title}} — {{when}}'),

  ('quest_cancelled', 'ru', 'Квест отменён', '{{title}} — {{when}}'),
  ('quest_cancelled', 'kk', 'Квест тоқтатылды', '{{title}} — {{when}}'),
  ('quest_cancelled', 'en', 'Quest cancelled', '{{title}} — {{when}}'),

  ('signup_confirmed', 'ru', 'Запись подтверждена', '{{title}} — {{when}}'),
  ('signup_confirmed', 'kk', 'Жазылу расталды', '{{title}} — {{when}}'),
  ('signup_confirmed', 'en', 'Sign-up confirmed', '{{title}} — {{when}}'),

  ('waitlist_promoted', 'ru', 'Место освободилось', 'Запись на «{{title}}» подтверждена — {{when}}'),
  ('waitlist_promoted', 'kk', 'Орын босады', '«{{title}}» квестіне жазылу расталды — {{when}}'),
  ('waitlist_promoted', 'en', 'A spot opened up', 'You are now signed up for “{{title}}” — {{when}}'),

  ('quest_reminder:day', 'ru', 'Квест через сутки', '{{title}} — {{when}}'),
  ('quest_reminder:day', 'kk', 'Квест бір тәуліктен кейін', '{{title}} — {{when}}'),
  ('quest_reminder:day', 'en', 'Quest in 24 hours', '{{title}} — {{when}}'),

  ('quest_reminder:soon', 'ru', 'Квест через 2 часа', '{{title}} — {{when}}. Не забудь отметиться по QR.'),
  ('quest_reminder:soon', 'kk', 'Квест 2 сағаттан кейін', '{{title}} — {{when}}. QR арқылы белгіленуді ұмытпа.'),
  ('quest_reminder:soon', 'en', 'Quest in 2 hours', '{{title}} — {{when}}. Don''t forget to check in with the QR code.'),

  ('shift_started', 'ru', 'Смена началась', '{{title}}: отметься по QR у координатора'),
  ('shift_started', 'kk', 'Ауысым басталды', '{{title}}: үйлестірушідегі QR арқылы белгілен'),
  ('shift_started', 'en', 'The shift has started', '{{title}}: check in with the coordinator''s QR code'),

  ('hours_confirmed', 'ru', 'Часы подтверждены', '{{title}} · Часы: {{duration}} · Баллы: +{{points}}'),
  ('hours_confirmed', 'kk', 'Сағаттар расталды', '{{title}} · Сағат: {{duration}} · Ұпай: +{{points}}'),
  ('hours_confirmed', 'en', 'Hours confirmed', '{{title}} · Hours: {{duration}} · Points: +{{points}}'),

  ('achievement_unlocked', 'ru', 'Новое достижение', '{{achievement}}'),
  ('achievement_unlocked', 'kk', 'Жаңа жетістік', '{{achievement}}'),
  ('achievement_unlocked', 'en', 'New achievement', '{{achievement}}'),

  ('dispute_resolved:resolved', 'ru', 'Ответ по спору', '{{title}}: спор решён. Открой квест, чтобы увидеть ответ.'),
  ('dispute_resolved:resolved', 'kk', 'Дау бойынша жауап', '{{title}}: дау шешілді. Жауапты көру үшін квестті аш.'),
  ('dispute_resolved:resolved', 'en', 'Dispute answered', '{{title}}: the dispute is resolved. Open the quest to see the answer.'),
  ('dispute_resolved:rejected', 'ru', 'Ответ по спору', '{{title}}: спор отклонён. Открой квест, чтобы увидеть причину.'),
  ('dispute_resolved:rejected', 'kk', 'Дау бойынша жауап', '{{title}}: дау қабылданбады. Себебін көру үшін квестті аш.'),
  ('dispute_resolved:rejected', 'en', 'Dispute answered', '{{title}}: the dispute was rejected. Open the quest to see why.'),

  ('dispute_opened', 'ru', 'Новый спор по часам', '{{title}}'),
  ('dispute_opened', 'kk', 'Сағаттар бойынша жаңа дау', '{{title}}'),
  ('dispute_opened', 'en', 'New hours dispute', '{{title}}'),

  ('join_approved', 'ru', 'Заявка принята', 'Добро пожаловать в «{{org}}»'),
  ('join_approved', 'kk', 'Өтінім қабылданды', '«{{org}}» ұйымына қош келдің'),
  ('join_approved', 'en', 'Request approved', 'Welcome to “{{org}}”'),

  ('join_rejected', 'ru', 'Заявка отклонена', '{{org}}'),
  ('join_rejected', 'kk', 'Өтінім қабылданбады', '{{org}}'),
  ('join_rejected', 'en', 'Request declined', '{{org}}'),

  ('role_changed:admin', 'ru', 'Роль изменена', '{{org}}: теперь ты администратор'),
  ('role_changed:admin', 'kk', 'Рөл өзгерді', '{{org}}: енді сен әкімшісің'),
  ('role_changed:admin', 'en', 'Your role changed', '{{org}}: you are now an admin'),
  ('role_changed:coordinator', 'ru', 'Роль изменена', '{{org}}: теперь ты координатор'),
  ('role_changed:coordinator', 'kk', 'Рөл өзгерді', '{{org}}: енді сен үйлестірушісің'),
  ('role_changed:coordinator', 'en', 'Your role changed', '{{org}}: you are now a coordinator'),
  ('role_changed:volunteer', 'ru', 'Роль изменена', '{{org}}: теперь ты волонтёр'),
  ('role_changed:volunteer', 'kk', 'Рөл өзгерді', '{{org}}: енді сен волонтёрсың'),
  ('role_changed:volunteer', 'en', 'Your role changed', '{{org}}: you are now a volunteer'),

  ('certificate_revoked', 'ru', 'Сертификат отозван', '{{org}}'),
  ('certificate_revoked', 'kk', 'Сертификат кері қайтарылды', '{{org}}'),
  ('certificate_revoked', 'en', 'Certificate revoked', '{{org}}');

create function private.push_key(p_type text, p_payload jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select p_type || case p_type
    when 'quest_reminder' then ':' || coalesce(p_payload ->> 'kind', '')
    when 'dispute_resolved' then ':' || coalesce(p_payload ->> 'status', '')
    when 'role_changed' then ':' || coalesce(p_payload ->> 'role', '')
    else ''
  end;
$$;

-- Те же формы, что useFormatDuration в приложении: «3 ч 30 мин», «45 мин», «2 ч».
create function private.format_duration(p_minutes integer, p_locale text)
returns text
language sql
immutable
set search_path = ''
as $$
  with parts as (
    select greatest(coalesce(p_minutes, 0), 0) / 60 as h, greatest(coalesce(p_minutes, 0), 0) % 60 as m,
           case p_locale when 'kk' then 'сағ' when 'en' then 'h' else 'ч' end as hu,
           case p_locale when 'en' then 'min' else 'мин' end as mu
  )
  select case
    when h = 0 then m || ' ' || mu
    when m = 0 then h || ' ' || hu
    else h || ' ' || hu || ' ' || m || ' ' || mu
  end
  from parts;
$$;

-- Готовое сообщение для одного уведомления: заголовок, текст и данные для перехода по нажатию.
create function private.render_push(p_notification public.notifications)
returns table (title text, body text, data jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_locale text;
  v_tz text;
  v_template private.push_templates;
  v_quest_id uuid;
  v_quest public.quests;
  v_points integer;
  v_text_title text;
  v_text_body text;
  v_values jsonb;
  v_key text;
begin
  select coalesce(p.locale, 'ru'), p.timezone into v_locale, v_tz
  from public.profiles p where p.id = p_notification.user_id;

  select * into v_template from private.push_templates t
  where t.key = private.push_key(p_notification.type, p_notification.payload)
  order by (t.locale = coalesce(v_locale, 'ru')) desc, (t.locale = 'ru') desc
  limit 1;
  if v_template.key is null then
    return;
  end if;

  v_quest_id := coalesce(
    (p_notification.payload ->> 'quest_id')::uuid,
    (select c.quest_id from public.disputes d
     join public.hour_confirmations c on c.id = d.confirmation_id
     where d.id = (p_notification.payload ->> 'dispute_id')::uuid));
  if v_quest_id is not null then
    select * into v_quest from public.quests q where q.id = v_quest_id;
  end if;

  if p_notification.type = 'hours_confirmed' then
    select coalesce(sum(l.points), 0)::int into v_points from public.points_ledger l
    where l.user_id = p_notification.user_id and l.quest_id = v_quest_id;
  end if;

  v_values := jsonb_build_object(
    'title', coalesce(p_notification.payload ->> 'title', v_quest.title, ''),
    'when', coalesce(to_char(v_quest.starts_at at time zone coalesce(v_tz, 'Asia/Almaty'),
                             'DD.MM HH24:MI'), ''),
    'duration', private.format_duration((p_notification.payload ->> 'minutes')::int, v_locale),
    'points', coalesce(v_points, 0)::text,
    'achievement', coalesce(
      (select a.name ->> v_locale from public.achievements a
       where a.id = (p_notification.payload ->> 'achievement_id')::uuid), ''),
    'org', coalesce((select o.name from public.organizations o where o.id = p_notification.org_id), '')
  );

  v_text_title := v_template.title;
  v_text_body := v_template.body;
  for v_key in select jsonb_object_keys(v_values) loop
    v_text_title := replace(v_text_title, '{{' || v_key || '}}', v_values ->> v_key);
    v_text_body := replace(v_text_body, '{{' || v_key || '}}', v_values ->> v_key);
  end loop;

  title := left(v_text_title, 120);
  body := left(v_text_body, 240);
  data := jsonb_strip_nulls(jsonb_build_object(
    'notification_id', p_notification.id,
    'type', p_notification.type,
    'org_id', p_notification.org_id,
    'quest_id', v_quest_id,
    'certificate_id', p_notification.payload ->> 'certificate_id'
  ));
  return next;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Запрос «запись подтверждена»: новая запись или повторная после отмены.
-- Переход из листа ожидания сообщает promote_waitlist (waitlist_promoted), здесь не дублируем.
-- -------------------------------------------------------------------------------------
create function private.notify_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'signed_up' and (tg_op = 'INSERT' or old.status = 'cancelled') then
    perform private.notify(new.user_id, new.org_id, 'signup_confirmed',
      jsonb_build_object('quest_id', new.quest_id,
                         'title', (select q.title from public.quests q where q.id = new.quest_id)));
  end if;
  return null;
end;
$$;

create trigger notify_signup after insert or update of status on public.quest_signups
  for each row execute function private.notify_signup();

-- -------------------------------------------------------------------------------------
-- Напоминания за 24 ч (day) и за 2 ч (soon). Каждое — не больше одного раза на запись.
-- «За сутки» не шлём тем, кто записался позже чем за сутки: они только что видели время.
-- -------------------------------------------------------------------------------------
create table private.quest_reminders (
  quest_id uuid not null references public.quests (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('day', 'soon')),
  created_at timestamptz not null default now(),
  primary key (quest_id, user_id, kind)
);
create index quest_reminders_user_idx on private.quest_reminders (user_id);

create function private.queue_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
begin
  with due as (
    select s.quest_id, s.user_id, q.org_id, q.title,
           case when q.starts_at <= v_now + interval '2 hours' then 'soon' else 'day' end as kind
    from public.quest_signups s
    join public.quests q on q.id = s.quest_id
    where s.status = 'signed_up'
      and q.status = 'published'
      and q.starts_at > v_now
      and q.starts_at <= v_now + interval '24 hours'
      and (q.starts_at <= v_now + interval '2 hours'
           or s.status_changed_at <= q.starts_at - interval '24 hours')
  ), sent as (
    insert into private.quest_reminders (quest_id, user_id, kind)
    select quest_id, user_id, kind from due
    on conflict do nothing
    returning quest_id, user_id, kind
  )
  insert into public.notifications (user_id, org_id, type, payload)
  select due.user_id, due.org_id, 'quest_reminder',
         jsonb_build_object('quest_id', due.quest_id, 'title', due.title, 'kind', due.kind)
  from sent join due using (quest_id, user_id, kind);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Отправка
-- -------------------------------------------------------------------------------------
create table private.push_requests (
  request_id bigint primary key,
  kind text not null check (kind in ('send', 'receipts')),
  -- send: по одному элементу на сообщение, в порядке сообщений (ответ Expo в том же порядке).
  notification_ids uuid[] not null default '{}',
  tokens text[] not null default '{}',
  created_at timestamptz not null default clock_timestamp(),
  processed_at timestamptz
);
create index push_requests_open_idx on private.push_requests (created_at) where processed_at is null;

-- Билеты Expo: по ним через 15 минут проверяем, дошло ли сообщение до Apple/Google.
create table private.push_tickets (
  ticket_id text primary key,
  token text not null,
  created_at timestamptz not null default clock_timestamp(),
  checked boolean not null default false
);
create index push_tickets_unchecked_idx on private.push_tickets (created_at) where not checked;

create function private.post_to_expo(p_path text, p_body jsonb)
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := 'https://exp.host/--/api/v2/push/' || p_path,
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
    timeout_milliseconds := 15000
  );
$$;

create function private.dispatch_push(p_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_notification public.notifications;
  v_title text;
  v_body text;
  v_data jsonb;
  v_token text;
  v_messages jsonb := '[]';
  v_ids uuid[] := '{}';
  v_tokens text[] := '{}';
  v_all uuid[] := '{}';
  v_request bigint;
begin
  -- Не отправляем: нет текста, пользователь отключил тип, нет устройств, событие устарело.
  update public.notifications n set push_status = 'skipped'
  where n.push_status = 'pending'
    and (not (n.type = any (private.push_types()))
         or not exists (select 1 from private.push_templates t
                        where t.key = private.push_key(n.type, n.payload))
         or exists (select 1 from public.notification_preferences p
                    where p.user_id = n.user_id and n.type = any (p.muted_types))
         or not exists (select 1 from public.push_tokens pt where pt.user_id = n.user_id)
         or n.created_at < v_now - interval '6 hours');

  for v_notification in
    select * from public.notifications n
    where n.push_status = 'pending'
    order by n.created_at, n.id
    limit p_limit
    for update skip locked
  loop
    -- Сбой одного уведомления (битый payload) не должен останавливать рассылку остальным.
    v_title := null;
    begin
      select m.title, m.body, m.data into v_title, v_body, v_data
      from private.render_push(v_notification) m;
    exception when others then
      v_title := null;
    end;
    if v_title is null then
      update public.notifications set push_status = 'failed' where id = v_notification.id;
      continue;
    end if;

    v_all := v_all || v_notification.id;
    for v_token in
      select pt.token from public.push_tokens pt where pt.user_id = v_notification.user_id
      order by pt.updated_at desc
    loop
      v_messages := v_messages || jsonb_build_array(jsonb_build_object(
        'to', v_token, 'title', v_title, 'body', v_body, 'data', v_data,
        'sound', 'default', 'channelId', 'default', 'priority', 'high'));
      v_ids := v_ids || v_notification.id;
      v_tokens := v_tokens || v_token;

      if jsonb_array_length(v_messages) = 100 then
        v_request := private.post_to_expo('send', v_messages);
        insert into private.push_requests (request_id, kind, notification_ids, tokens)
        values (v_request, 'send', v_ids, v_tokens);
        v_messages := '[]';
        v_ids := '{}';
        v_tokens := '{}';
      end if;
    end loop;
  end loop;

  if jsonb_array_length(v_messages) > 0 then
    v_request := private.post_to_expo('send', v_messages);
    insert into private.push_requests (request_id, kind, notification_ids, tokens)
    values (v_request, 'send', v_ids, v_tokens);
  end if;

  update public.notifications
  set push_status = 'sending', push_attempts = push_attempts + 1
  where id = any (v_all);
  return coalesce(array_length(v_all, 1), 0);
end;
$$;

-- Разбор ответов Expo. Сеть или сервер Expo подвели — до 3 попыток; ошибка в билете
-- (неверный токен и т. п.) — окончательная. DeviceNotRegistered удаляет токен.
create function private.process_push_responses()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request private.push_requests;
  v_response record;
  v_body jsonb;
  v_ticket jsonb;
  v_ok uuid[];
  v_count integer := 0;
  i integer;
begin
  for v_request in
    select * from private.push_requests where processed_at is null order by created_at for update skip locked
  loop
    select r.status_code, r.content, r.timed_out, r.error_msg into v_response
    from net._http_response r where r.id = v_request.request_id;

    if not found then
      -- Ответа ещё нет. Если его нет 10 минут (pg_net хранит ответы ограниченное время) — сбой сети.
      if v_request.created_at > clock_timestamp() - interval '10 minutes' then
        continue;
      end if;
    end if;

    begin
      v_body := case when found and v_response.status_code = 200 then v_response.content::jsonb end;
    exception when others then
      v_body := null;
    end;

    if v_request.kind = 'send' then
      if v_body is null or jsonb_typeof(v_body -> 'data') <> 'array' then
        update public.notifications
        set push_status = case when push_attempts >= 3 then 'failed' else 'pending' end
        where id = any (v_request.notification_ids) and push_status = 'sending';
      else
        v_ok := '{}';
        for i in 1 .. coalesce(array_length(v_request.tokens, 1), 0) loop
          v_ticket := v_body -> 'data' -> (i - 1);
          if v_ticket ->> 'status' = 'ok' then
            v_ok := v_ok || v_request.notification_ids[i];
            if v_ticket ? 'id' then
              insert into private.push_tickets (ticket_id, token)
              values (v_ticket ->> 'id', v_request.tokens[i]) on conflict do nothing;
            end if;
          elsif v_ticket -> 'details' ->> 'error' = 'DeviceNotRegistered' then
            delete from public.push_tokens where token = v_request.tokens[i];
          end if;
        end loop;
        update public.notifications
        set push_status = case when id = any (v_ok) then 'sent' else 'failed' end,
            pushed_at = case when id = any (v_ok) then clock_timestamp() end
        where id = any (v_request.notification_ids) and push_status = 'sending';
      end if;
    elsif v_body is not null and jsonb_typeof(v_body -> 'data') = 'object' then
      -- Квитанции: { data: { "<ticket>": { status, details: { error } } } }
      delete from public.push_tokens pt
      using private.push_tickets t, jsonb_each(v_body -> 'data') e
      where t.ticket_id = e.key and pt.token = t.token
        and e.value -> 'details' ->> 'error' = 'DeviceNotRegistered';
    end if;

    update private.push_requests set processed_at = clock_timestamp()
    where request_id = v_request.request_id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Квитанции по билетам старше 15 минут (до 1000 за запрос). Expo хранит их сутки.
create function private.request_push_receipts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids text[];
  v_request bigint;
begin
  delete from private.push_tickets where created_at < clock_timestamp() - interval '1 day';
  select array_agg(ticket_id) into v_ids from (
    select ticket_id from private.push_tickets
    where not checked and created_at < clock_timestamp() - interval '15 minutes'
    order by created_at limit 1000
    for update skip locked
  ) t;
  if v_ids is null then
    return 0;
  end if;
  v_request := private.post_to_expo('getReceipts', jsonb_build_object('ids', to_jsonb(v_ids)));
  insert into private.push_requests (request_id, kind) values (v_request, 'receipts');
  update private.push_tickets set checked = true where ticket_id = any (v_ids);
  return array_length(v_ids, 1);
end;
$$;

create function private.push_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Шаги независимы: ошибка в одном (например, разборе ответа) не блокирует остальные.
  begin
    perform private.process_push_responses();
  exception when others then
    raise warning 'push: process_push_responses: %', sqlerrm;
  end;
  begin
    perform private.queue_reminders();
  exception when others then
    raise warning 'push: queue_reminders: %', sqlerrm;
  end;
  begin
    perform private.request_push_receipts();
  exception when others then
    raise warning 'push: request_push_receipts: %', sqlerrm;
  end;
  begin
    perform private.dispatch_push();
  exception when others then
    raise warning 'push: dispatch_push: %', sqlerrm;
  end;
  delete from private.push_requests
  where processed_at < clock_timestamp() - interval '1 day';
end;
$$;

select cron.schedule('push-notifications', '15 seconds', 'select private.push_tick()');

-- -------------------------------------------------------------------------------------
-- Регистрация устройства
-- -------------------------------------------------------------------------------------
create function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$'
     or p_platform is null or p_platform not in ('ios', 'android') then
    raise exception 'invalid_push_token' using errcode = 'P0001';
  end if;
  -- Не больше 10 устройств на человека: самые старые вытесняются.
  delete from public.push_tokens
  where user_id = v_uid and token <> p_token
    and token not in (select token from public.push_tokens where user_id = v_uid
                      order by updated_at desc limit 9);
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, v_uid, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

-- Перед выходом из аккаунта: телефон перестаёт получать пуши этого пользователя.
create function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  delete from public.push_tokens where token = p_token and user_id = v_uid;
end;
$$;

-- -------------------------------------------------------------------------------------
-- Доступ
-- -------------------------------------------------------------------------------------
revoke execute on function
  private.push_types(), private.push_key(text, jsonb), private.format_duration(integer, text),
  private.render_push(public.notifications), private.notify_signup(), private.queue_reminders(),
  private.post_to_expo(text, jsonb), private.dispatch_push(integer),
  private.process_push_responses(), private.request_push_receipts(), private.push_tick()
from public, anon, authenticated;
-- CHECK в notification_preferences вызывает push_types() от имени того, кто пишет строку.
grant execute on function private.push_types() to authenticated;

revoke execute on function public.register_push_token(text, text), public.unregister_push_token(text)
  from public, anon;
grant execute on function public.register_push_token(text, text), public.unregister_push_token(text)
  to authenticated;
