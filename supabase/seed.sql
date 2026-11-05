-- =====================================================================================
-- Seed для локальной разработки: 1 организация, 1 админ, 2 координатора, 10 волонтёров,
-- 8 квестов разной сложности. Даты считаются от now(), поэтому seed не устаревает.
-- Вход: email из списка ниже, код приходит в локальный почтовый ящик http://127.0.0.1:54324
-- =====================================================================================

-- Пользователи --------------------------------------------------------------------------
-- Пустые строки вместо NULL в токенах обязательны: иначе GoTrue не может прочитать пользователя.
with seed_users (id, email, full_name) as (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@taza.test', 'Айгерим Нурланова'),
    ('c0000000-0000-4000-8000-000000000001'::uuid, 'coord1@taza.test', 'Данияр Сапаров'),
    ('c0000000-0000-4000-8000-000000000002'::uuid, 'coord2@taza.test', 'Мадина Ержанова'),
    ('f0000000-0000-4000-8000-000000000001'::uuid, 'vol1@taza.test', 'Арман Касымов'),
    ('f0000000-0000-4000-8000-000000000002'::uuid, 'vol2@taza.test', 'Алия Бекова'),
    ('f0000000-0000-4000-8000-000000000003'::uuid, 'vol3@taza.test', 'Тимур Ахметов'),
    ('f0000000-0000-4000-8000-000000000004'::uuid, 'vol4@taza.test', 'Дана Жумабаева'),
    ('f0000000-0000-4000-8000-000000000005'::uuid, 'vol5@taza.test', 'Ерлан Мусин'),
    ('f0000000-0000-4000-8000-000000000006'::uuid, 'vol6@taza.test', 'Камила Исаева'),
    ('f0000000-0000-4000-8000-000000000007'::uuid, 'vol7@taza.test', 'Нурсултан Омаров'),
    ('f0000000-0000-4000-8000-000000000008'::uuid, 'vol8@taza.test', 'Сабина Ким'),
    ('f0000000-0000-4000-8000-000000000009'::uuid, 'vol9@taza.test', 'Ильяс Абдрахманов'),
    ('f0000000-0000-4000-8000-000000000010'::uuid, 'vol10@taza.test', 'Жанна Серикова')
),
inserted as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  select
    '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, '', now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', full_name), now(), now(),
    '', '', '', '', '', '', '', ''
  from seed_users
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       now(), now(), now()
from inserted;

-- Профили созданы триггером; уточняем настройки.
update public.profiles set locale = 'kk' where id = 'f0000000-0000-4000-8000-000000000002';
update public.profiles set hide_from_leaderboard = true where id = 'f0000000-0000-4000-8000-000000000010';

-- Организация и участники ------------------------------------------------------------------
-- Админ добавляется автоматически триггером add_creator_as_admin.
insert into public.organizations (id, name, slug, description, created_by)
values (
  '0e000000-0000-4000-8000-000000000001',
  'Taza Qala',
  'taza-qala',
  'Волонтёрское движение за чистый Алматы: уборки парков, берегов рек и предгорий.',
  'a0000000-0000-4000-8000-000000000001'
);

insert into public.memberships (org_id, user_id, role)
select '0e000000-0000-4000-8000-000000000001', id, role::public.org_role
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'coordinator'),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'coordinator'),
  ('f0000000-0000-4000-8000-000000000001'::uuid, 'volunteer'),
  ('f0000000-0000-4000-8000-000000000002'::uuid, 'volunteer'),
  ('f0000000-0000-4000-8000-000000000003'::uuid, 'volunteer'),
  ('f0000000-0000-4000-8000-000000000004'::uuid, 'volunteer'),
  ('f0000000-0000-4000-8000-000000000005'::uuid, 'volunteer'),
  ('f0000000-0000-4000-8000-000000000006'::uuid, 'volunteer'),
  ('f0000000-0000-4000-8000-000000000007'::uuid, 'volunteer'),
  ('f0000000-0000-4000-8000-000000000008'::uuid, 'volunteer'),
  ('f0000000-0000-4000-8000-000000000009'::uuid, 'volunteer'),
  ('f0000000-0000-4000-8000-000000000010'::uuid, 'volunteer')
) as m (id, role);

-- Справочники -------------------------------------------------------------------------------
insert into public.skills (id, code, name) values
  ('5c000000-0000-4000-8000-000000000001', 'teamwork',      '{"kk":"Командалық жұмыс","ru":"Работа в команде","en":"Teamwork"}'),
  ('5c000000-0000-4000-8000-000000000002', 'ecology',       '{"kk":"Экология","ru":"Экология","en":"Ecology"}'),
  ('5c000000-0000-4000-8000-000000000003', 'leadership',    '{"kk":"Көшбасшылық","ru":"Лидерство","en":"Leadership"}'),
  ('5c000000-0000-4000-8000-000000000004', 'communication', '{"kk":"Коммуникация","ru":"Коммуникация","en":"Communication"}'),
  ('5c000000-0000-4000-8000-000000000005', 'organization',  '{"kk":"Ұйымдастыру","ru":"Организация","en":"Organization"}'),
  ('5c000000-0000-4000-8000-000000000006', 'endurance',     '{"kk":"Төзімділік","ru":"Выносливость","en":"Endurance"}');

insert into public.achievements (code, name, description, icon) values
  ('first_quest', '{"kk":"Алғашқы квест","ru":"Первый квест","en":"First quest"}',
                  '{"kk":"Алғашқы квестті аяқтадың","ru":"Завершил первый квест","en":"Completed your first quest"}', 'flag'),
  ('hours_10',    '{"kk":"10 сағат","ru":"10 часов","en":"10 hours"}',
                  '{"kk":"10 расталған сағат","ru":"10 подтверждённых часов","en":"10 confirmed hours"}', 'time'),
  ('hours_50',    '{"kk":"50 сағат","ru":"50 часов","en":"50 hours"}',
                  '{"kk":"50 расталған сағат","ru":"50 подтверждённых часов","en":"50 confirmed hours"}', 'hourglass'),
  ('streak_5',    '{"kk":"Қатарынан 5 квест","ru":"5 заданий подряд","en":"5 quests in a row"}',
                  '{"kk":"Қатарынан 5 квестке қатыстың","ru":"Пять квестов подряд без пропусков","en":"Five quests in a row"}', 'flame'),
  ('extreme_done','{"kk":"Экстрим өтілді","ru":"Экстрим пройден","en":"Extreme cleared"}',
                  '{"kk":"Экстрим квестті аяқтадың","ru":"Завершил квест сложности «Экстрим»","en":"Completed an Extreme quest"}', 'trophy');

-- Задача «сверху» --------------------------------------------------------------------------
insert into public.tasks (id, org_id, title, description, address, lat, lng, status, created_by)
values (
  '7a000000-0000-4000-8000-000000000001',
  '0e000000-0000-4000-8000-000000000001',
  'Загрязнён берег Есентая у Аль-Фараби',
  'Жители сообщают о стихийной свалке вдоль набережной.',
  'Набережная Есентай, пр. Аль-Фараби',
  43.2187, 76.9286,
  'in_progress',
  'a0000000-0000-4000-8000-000000000001'
);

-- Квесты: 8 штук разной сложности и статуса ----------------------------------------------------
insert into public.quests (
  id, org_id, task_id, title, description, difficulty, status, address, lat, lng, radius_m,
  starts_at, ends_at, capacity, coordinator_id, bring_items, provided_items, bags_collected, area_m2, created_by
)
select
  q.id::uuid, '0e000000-0000-4000-8000-000000000001', q.task_id::uuid, q.title, q.description,
  q.difficulty::public.quest_difficulty, q.status::public.quest_status, q.address, q.lat, q.lng, 300,
  date_trunc('hour', now()) + q.start_offset, date_trunc('hour', now()) + q.start_offset + q.duration,
  q.capacity, q.coordinator::uuid, q.bring, q.provided, q.bags, q.area,
  'a0000000-0000-4000-8000-000000000001'
from (values
  -- Завершённые (есть подтверждённые часы и баллы)
  ('9e000000-0000-4000-8000-000000000001', null, 'Субботник в парке Горького',
   'Собираем мусор на аллеях и у пруда.', 'easy', 'completed',
   'Центральный парк, ул. Гоголя 1', 43.2614, 76.9666, interval '-14 days', interval '3 hours', 15,
   'c0000000-0000-4000-8000-000000000001', array['Вода', 'Удобная обувь'], array['Перчатки', 'Мешки'], 24, 6000),
  ('9e000000-0000-4000-8000-000000000002', '7a000000-0000-4000-8000-000000000001', 'Берег Есентая: первая волна',
   'Очищаем набережную от строительного мусора.', 'hard', 'completed',
   'Набережная Есентай, пр. Аль-Фараби', 43.2187, 76.9286, interval '-7 days', interval '4 hours', 10,
   'c0000000-0000-4000-8000-000000000002', array['Вода', 'Головной убор'], array['Перчатки', 'Мешки', 'Грабли'], 40, 3500),
  -- Предстоящие
  ('9e000000-0000-4000-8000-000000000003', '7a000000-0000-4000-8000-000000000001', 'Берег Есентая: вторая волна',
   'Добираем то, что осталось после первой уборки.', 'medium', 'published',
   'Набережная Есентай, пр. Аль-Фараби', 43.2187, 76.9286, interval '2 days', interval '3 hours', 12,
   'c0000000-0000-4000-8000-000000000002', array['Вода'], array['Перчатки', 'Мешки'], null, null),
  ('9e000000-0000-4000-8000-000000000004', null, 'Ботанический сад: уборка листвы',
   'Сгребаем листву и разбираем компост.', 'easy', 'published',
   'Ботанический сад, ул. Тимирязева 36Д', 43.2238, 76.9154, interval '3 days', interval '2 hours', 3,
   'c0000000-0000-4000-8000-000000000001', array['Перчатки, если есть свои'], array['Грабли', 'Мешки'], null, null),
  ('9e000000-0000-4000-8000-000000000005', null, 'Медеу: тропа к плотине',
   'Чистим туристическую тропу от пластика.', 'hard', 'published',
   'Урочище Медеу', 43.1574, 77.0590, interval '5 days', interval '5 hours', 8,
   'c0000000-0000-4000-8000-000000000002', array['Треккинговая обувь', 'Вода 1,5 л', 'Перекус'], array['Мешки', 'Перчатки'], null, null),
  ('9e000000-0000-4000-8000-000000000006', null, 'Большое Алматинское озеро',
   'Высокогорная уборка у озера. Нужна хорошая физическая форма.', 'extreme', 'published',
   'БАО, Иле-Алатауский нацпарк', 43.0506, 76.9853, interval '9 days', interval '8 hours', 6,
   'c0000000-0000-4000-8000-000000000001', array['Тёплая одежда', 'Треккинговая обувь', 'Вода 2 л'], array['Мешки', 'Перчатки', 'Аптечка'], null, null),
  ('9e000000-0000-4000-8000-000000000007', null, 'Двор на Абая: покраска скамеек',
   'Красим скамейки и убираем детскую площадку.', 'medium', 'published',
   'пр. Абая 52', 43.2401, 76.9154, interval '12 days', interval '3 hours', 10,
   'c0000000-0000-4000-8000-000000000002', array['Старая одежда'], array['Краска', 'Кисти', 'Перчатки'], null, null),
  -- Черновик: видят только админ и координаторы
  ('9e000000-0000-4000-8000-000000000008', null, 'Весенняя уборка Кок-Тобе',
   'Планируем на весну, детали уточняются.', 'medium', 'draft',
   'Кок-Тобе', 43.2330, 76.9771, interval '30 days', interval '4 hours', 20,
   'c0000000-0000-4000-8000-000000000001', array[]::text[], array['Мешки'], null, null)
) as q (id, task_id, title, description, difficulty, status, address, lat, lng, start_offset, duration,
        capacity, coordinator, bring, provided, bags, area);

insert into public.quest_skills (quest_id, skill_id, xp) values
  ('9e000000-0000-4000-8000-000000000001', '5c000000-0000-4000-8000-000000000001', 10),
  ('9e000000-0000-4000-8000-000000000001', '5c000000-0000-4000-8000-000000000002', 15),
  ('9e000000-0000-4000-8000-000000000002', '5c000000-0000-4000-8000-000000000002', 25),
  ('9e000000-0000-4000-8000-000000000002', '5c000000-0000-4000-8000-000000000006', 20),
  ('9e000000-0000-4000-8000-000000000003', '5c000000-0000-4000-8000-000000000002', 15),
  ('9e000000-0000-4000-8000-000000000003', '5c000000-0000-4000-8000-000000000001', 10),
  ('9e000000-0000-4000-8000-000000000004', '5c000000-0000-4000-8000-000000000002', 10),
  ('9e000000-0000-4000-8000-000000000005', '5c000000-0000-4000-8000-000000000006', 25),
  ('9e000000-0000-4000-8000-000000000005', '5c000000-0000-4000-8000-000000000002', 15),
  ('9e000000-0000-4000-8000-000000000006', '5c000000-0000-4000-8000-000000000006', 40),
  ('9e000000-0000-4000-8000-000000000006', '5c000000-0000-4000-8000-000000000003', 20),
  ('9e000000-0000-4000-8000-000000000007', '5c000000-0000-4000-8000-000000000004', 10),
  ('9e000000-0000-4000-8000-000000000007', '5c000000-0000-4000-8000-000000000005', 15),
  ('9e000000-0000-4000-8000-000000000008', '5c000000-0000-4000-8000-000000000001', 10);

-- Записи на квесты ----------------------------------------------------------------------------
-- Квест 4 (3 места) заполнен: трое записаны, двое в листе ожидания.
insert into public.quest_signups (quest_id, user_id, status, created_at)
select quest::uuid, ('f0000000-0000-4000-8000-0000000000' || lpad(vol::text, 2, '0'))::uuid,
       status::public.signup_status, now() - (n || ' minutes')::interval
from (values
  ('9e000000-0000-4000-8000-000000000001', 1, 'signed_up', 10), ('9e000000-0000-4000-8000-000000000001', 2, 'signed_up', 9),
  ('9e000000-0000-4000-8000-000000000001', 3, 'signed_up', 8),  ('9e000000-0000-4000-8000-000000000001', 4, 'signed_up', 7),
  ('9e000000-0000-4000-8000-000000000002', 1, 'signed_up', 10), ('9e000000-0000-4000-8000-000000000002', 5, 'signed_up', 9),
  ('9e000000-0000-4000-8000-000000000002', 6, 'signed_up', 8),
  ('9e000000-0000-4000-8000-000000000003', 1, 'signed_up', 10), ('9e000000-0000-4000-8000-000000000003', 2, 'signed_up', 9),
  ('9e000000-0000-4000-8000-000000000003', 7, 'signed_up', 8),
  ('9e000000-0000-4000-8000-000000000004', 3, 'signed_up', 10), ('9e000000-0000-4000-8000-000000000004', 4, 'signed_up', 9),
  ('9e000000-0000-4000-8000-000000000004', 5, 'signed_up', 8),  ('9e000000-0000-4000-8000-000000000004', 6, 'waitlisted', 7),
  ('9e000000-0000-4000-8000-000000000004', 8, 'waitlisted', 6),
  ('9e000000-0000-4000-8000-000000000005', 9, 'signed_up', 10),
  ('9e000000-0000-4000-8000-000000000006', 1, 'signed_up', 10)
) as s (quest, vol, status, n);

insert into public.quest_signups (quest_id, user_id, status, cancelled_at)
values ('9e000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000010', 'cancelled', now() - interval '1 day');

-- Смены и подтверждённые часы по завершённым квестам -----------------------------------------
-- Квест 1 (easy, 3 ч): vol1..vol4. Квест 2 (hard, 4 ч): vol1, vol5, vol6.
insert into public.attendance_sessions (
  quest_id, user_id, status, check_in_at, check_out_at, check_in_method, check_out_method,
  check_in_lat, check_in_lng, recorded_by
)
select s.quest::uuid, s.vol::uuid, 'confirmed',
       q.starts_at + s.late, q.ends_at - s.early, s.method::public.attendance_method,
       case when s.early > interval '0' then 'qr' else 'manual' end::public.attendance_method,
       q.lat + 0.0005, q.lng - 0.0004,
       case when s.method = 'manual' then q.coordinator_id end
from (values
  ('9e000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', interval '2 min',  interval '0',      'qr'),
  ('9e000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', interval '10 min', interval '0',      'qr'),
  ('9e000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000003', interval '0',      interval '50 min', 'manual'),
  ('9e000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000004', interval '5 min',  interval '0',      'qr'),
  ('9e000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001', interval '0',      interval '0',      'qr'),
  ('9e000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000005', interval '7 min',  interval '0',      'qr'),
  ('9e000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000006', interval '0',      interval '1 hour', 'qr')
) as s (quest, vol, late, early, method)
join public.quests q on q.id = s.quest::uuid;

-- Минуты: фактическое время, округлённое вверх до 15 минут (в пользу волонтёра).
insert into public.hour_confirmations (
  quest_id, user_id, confirmed_minutes, rating_quality, rating_activity, rating_teamwork, comment, confirmed_by, confirmed_at
)
select a.quest_id, a.user_id,
       (ceil(extract(epoch from a.check_out_at - a.check_in_at) / 60 / 15) * 15)::int,
       r.q, r.a, r.t, r.comment, q.coordinator_id, q.ends_at + interval '30 min'
from public.attendance_sessions a
join public.quests q on q.id = a.quest_id
join (values
  ('f0000000-0000-4000-8000-000000000001', '9e000000-0000-4000-8000-000000000001', 5, 5, 4, 'Отлично организовал свою группу.'),
  ('f0000000-0000-4000-8000-000000000002', '9e000000-0000-4000-8000-000000000001', 4, 4, 5, 'Активно помогала новичкам.'),
  ('f0000000-0000-4000-8000-000000000003', '9e000000-0000-4000-8000-000000000001', 3, 3, 3, 'Ушёл раньше, но свою зону убрал.'),
  ('f0000000-0000-4000-8000-000000000004', '9e000000-0000-4000-8000-000000000001', 4, 5, 4, ''),
  ('f0000000-0000-4000-8000-000000000001', '9e000000-0000-4000-8000-000000000002', 5, 5, 5, 'Тащил самые тяжёлые мешки.'),
  ('f0000000-0000-4000-8000-000000000005', '9e000000-0000-4000-8000-000000000002', 4, 4, 4, ''),
  ('f0000000-0000-4000-8000-000000000006', '9e000000-0000-4000-8000-000000000002', 3, 4, 3, 'Ушла на час раньше.')
) as r (vol, quest, q, a, t, comment) on r.vol::uuid = a.user_id and r.quest::uuid = a.quest_id;

-- Пример корректировки с причиной (видна волонтёру и в аудите).
insert into public.adjustments (confirmation_id, field, old_value, new_value, reason, adjusted_by)
select c.id, 'confirmed_minutes', '165', c.confirmed_minutes::text,
       'Отметился с опозданием из-за очереди на QR, пришёл вовремя', c.confirmed_by
from public.hour_confirmations c
where c.user_id = 'f0000000-0000-4000-8000-000000000002' and c.quest_id = '9e000000-0000-4000-8000-000000000001';

-- Баллы по формуле этапа 6: база_сложности × часы × множитель(округлённая средняя оценка).
insert into public.points_ledger (user_id, org_id, quest_id, confirmation_id, points, reason)
select c.user_id, c.org_id, c.quest_id, c.id,
       round(
         (case q.difficulty when 'easy' then 10 when 'medium' then 20 when 'hard' then 35 else 50 end)
         * c.confirmed_minutes / 60.0
         * (case round((c.rating_quality + c.rating_activity + c.rating_teamwork) / 3.0)
              when 1 then 0.6 when 2 then 0.8 when 3 then 1.0 when 4 then 1.15 else 1.3 end)
       )::int,
       'quest_completed'
from public.hour_confirmations c
join public.quests q on q.id = c.quest_id;

-- Опыт навыков и достижения участников завершённых квестов.
insert into public.user_skills (user_id, skill_id, xp)
select c.user_id, qs.skill_id, sum(qs.xp)
from public.hour_confirmations c
join public.quest_skills qs on qs.quest_id = c.quest_id
group by c.user_id, qs.skill_id;

insert into public.user_achievements (user_id, achievement_id, org_id)
select distinct c.user_id, a.id, c.org_id
from public.hour_confirmations c
cross join public.achievements a
where a.code = 'first_quest';

-- Открытый спор: vol6 не согласна с часами.
insert into public.disputes (confirmation_id, comment)
select c.id, 'Я ушла на 30 минут раньше, а не на час — координатор отметил выход позже, чем нужно.'
from public.hour_confirmations c
where c.user_id = 'f0000000-0000-4000-8000-000000000006';

-- Уведомления.
insert into public.notifications (user_id, org_id, type, payload)
select c.user_id, c.org_id, 'hours_confirmed',
       jsonb_build_object('quest_id', c.quest_id, 'minutes', c.confirmed_minutes)
from public.hour_confirmations c;

insert into public.notifications (user_id, org_id, type, payload)
select m.user_id, m.org_id, 'new_quest', jsonb_build_object('quest_id', '9e000000-0000-4000-8000-000000000007')
from public.memberships m
where m.role = 'volunteer';

-- Этап 3: приглашения и заявки ---------------------------------------------------------------
-- Постоянное приглашение волонтёров для разработки: tazaniyet://join/tazaqala-join-01
insert into public.org_invites (org_id, code, role, created_by, expires_at)
values ('0e000000-0000-4000-8000-000000000001', 'tazaqala-join-01', 'volunteer',
        'a0000000-0000-4000-8000-000000000001', null);

-- Новичок без организации подал заявку на вступление.
with u as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-8000-000000000099', 'authenticated',
    'authenticated', 'newbie@taza.test', '', now(), '{"provider":"email","providers":["email"]}',
    '{"full_name":"Асель Новикова"}', now(), now(), '', '', '', '', '', '', '', ''
  ) returning id, email
)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from u;

insert into public.join_requests (org_id, user_id, message)
values ('0e000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000099',
        'Хочу помогать с уборками по выходным.');
