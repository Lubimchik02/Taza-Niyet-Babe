# Taza Niyet — правила проекта

Мобильное приложение для волонтёров: подтверждённые часы, баллы, навыки, сертификаты.
Полное задание: [PROMPT_Taza_Niyet.md](PROMPT_Taza_Niyet.md). Принятые решения: [DECISIONS.md](DECISIONS.md).
Особенности Expo SDK 58: [AGENTS.md](AGENTS.md) — **не полагайся на память об API Expo, сверяйся с документацией своей версии.**

## Главное

1. **Учёт часов — главное звено.** Часы нельзя накрутить и нельзя потерять. Любой код, касающийся
   check-in/check-out, расчёта часов и баллов, сначала покрывается тестами.
2. **Безопасность на сервере.** Права проверяет Postgres (RLS на _каждой_ таблице) и Edge Functions.
   Защита маршрутов в клиенте (`Stack.Protected`) — только UX, а не контроль доступа.
3. **Секреты не попадают в клиент и в git.** В приложении только `EXPO_PUBLIC_*` (URL Supabase,
   publishable key, адрес веб-версии). Service role / secret key — только в Edge Functions.
   `.env` в `.gitignore`. Без входа доступна только `verify_certificate` — и только данные,
   напечатанные на сертификате.
4. **Неизменяемые журналы.** `audit_log` и `points_ledger` — только append. Правки часов — только через
   `adjustments` с обязательной причиной.
5. **Время.** Хранится и считается на сервере в UTC, показывается в часовом поясе пользователя.
   Округление — до 15 минут в пользу волонтёра.
6. **Работаем по этапам** из задания, по порядку. После каждого этапа приложение запускается,
   а `npm run check` зелёный. Неоднозначность → разумное решение + запись в `DECISIONS.md`.

## Стек

Expo SDK 58 + Expo Router (`src/app/`), TypeScript strict, Supabase (Postgres, Auth, RLS, Storage,
Edge Functions, Realtime), TanStack Query (серверные данные) + Zustand (локальное состояние),
expo-sqlite (хранилище сессии, позже офлайн-очередь), react-hook-form + zod, i18next (kk/ru/en).

## Структура

```
src/app/            только маршруты (экраны и _layout); логику сюда не класть
  (auth)/           вход по OTP: sign-in, verify
  (app)/            стек после входа: (tabs)/ — вкладки, organizations/ (+ [orgId]/admin/), quests/,
                    certificates/, scan, checkin/
  join/[code].tsx   приглашение по ссылке/QR — доступно в любом состоянии входа
  verify/[id].tsx   публичная проверка сертификата — без входа; только данные verify_certificate
  onboarding.tsx
src/features/<x>/   логика фичи: api.ts, schemas.ts (zod), сторы, components/, __tests__/
src/components/ui/  общие UI-компоненты (Button, TextField, AppText, Screen…)
src/theme/          палитра, токены, ThemeProvider (светлая/тёмная)
src/i18n/           locales/ru.ts — эталон; kk и en типизированы по нему
src/lib/            supabase, env, storage, query-client
supabase/migrations/ схема и RLS (только новые файлы; применённые миграции не редактировать)
supabase/seed.sql    данные для разработки (фиксированные UUID — на них опираются тесты)
supabase/tests/database/ pgTAP-тесты схемы и политик доступа
```

## База данных

- Каждая новая таблица в `public`: `enable row level security`, политики, `created_at`/`updated_at`
  с триггером `set_updated_at`, индексы на все внешние ключи. Тест `00_schema` упадёт, если
  у таблицы нет RLS или политик, или если у `anon` появились привилегии.
- Проверки ролей в политиках — только через `private.is_org_member / is_org_manager / is_org_admin /
shares_org_with`; `auth.uid()` в политиках оборачивать в `(select auth.uid())`.
- Запись в доверенные таблицы (`quest_signups`, `attendance_sessions`, `hour_confirmations`,
  `adjustments`, `points_ledger`, `audit_log`, `certificates`, `user_skills`, `user_achievements`)
  клиенту запрещена привилегиями — только через security definer функции / Edge Functions,
  которые проверяют бизнес-правила.
- Security definer функции: в схеме `private` (или явно проверяют права), всегда `set search_path = ''`
  и полностью квалифицированные имена.
- Изменения в организации пишутся в `audit_log` триггером `audit` — подключай его к новым таблицам
  с действиями пользователей.
- Действия с бизнес-правилами — функции `public.*` (security definer), которые сами проверяют
  права и бросают `raise exception 'код' using errcode = 'P0001'`. Новый код ошибки добавлять в
  `DB_ERROR_CODES` (`src/lib/db-errors.ts`) и в `errors.*` всех локалей.
- `execute` на новые функции: `revoke … from public, anon` и `grant … to authenticated`.
- После изменения схемы: `npm run db:types`, чтобы обновить `src/lib/database.types.ts`.

## Клиентские данные

- Запросы к Supabase — в `features/*/api.ts` через `unwrap()` (бросает `DbError` с кодом),
  хуки TanStack Query — в `features/*/queries.ts`, ключи — фабрикой (`orgKeys`).
- После мутации инвалидировать затронутые ключи. При смене пользователя кэш очищается целиком
  (`session-store`), поэтому ключи не обязаны содержать userId.
- Новые маршруты дают ошибки типов `Href`, пока не запущен dev-сервер (`npm start` перегенерирует
  `.expo/types`).
- Вложенные компоненты внутри рендера не объявлять (`function Form()` в теле компонента):
  поле ввода пересоздаётся на каждый символ и теряет фокус. Только JSX-значение или отдельный компонент.
- Уведомления: только через `private.notify` в SQL — пуш уйдёт сам (`private.push_tick`).
  Новый тип пуша: `private.push_types()` + `push_templates` (kk/ru/en) в миграции,
  `PUSH_TYPES`/`PUSH_CATEGORIES` и `notifications.kinds` в локалях (сверяет `notifications-test`).
- Экспорт: PDF — `lib/pdf-export`, файлы (CSV) — `lib/share-file` (у обоих есть `.web.ts`).
- Нативные библиотеки без веб-версии (`react-native-maps`) — через пару файлов
  `X.native.tsx` (телефон) и `X.tsx` (веб-запасной вариант) с общими типами в `X.types.ts`.
- В формах react-hook-form — `useWatch`, а не `watch()` (несовместим с React Compiler);
  в обработчиках читать актуальное значение через `getValues()`, а не из замыкания рендера.
- Время: в БД UTC; ввод времени квеста — в поясе организации (`features/quests/time.ts`),
  показ — в поясе устройства. Баллы — только через `features/points/config.ts`.
- `Date.now()` / `new Date()` прямо в рендере — нельзя (React Compiler): время из `useNow()`.

## Учёт часов (не ломать)

- Отметки — только через `submitAttendance` (`features/attendance/queue.ts`): событие с
  `client_event_id` сначала отправляется сразу, без сети — в очередь. Не вызывать RPC отметок
  напрямую из экранов, иначе офлайн и защита от дублей перестанут работать.
- Сервер — единственный источник правды о часах: клиент показывает `rounded_minutes`
  из `shift_summary` / `my_quest_attendance`, а не считает сам.
- Любое изменение часов или времени — с причиной (`adjust_session`, `confirm_hours`).
- Время событий в SQL — `clock_timestamp()`, не `now()`.
- Изменения в `05_attendance.test.sql` — только добавлением проверок; ослаблять нельзя.

## Команды

```bash
npm start              # dev-сервер Expo
npm run check          # typecheck + lint + тесты — запускать перед тем, как считать задачу готовой
npm test               # Jest
npx expo install <pkg> # ВСЕГДА вместо npm install для зависимостей приложения (совместимые версии)
npx expo-doctor        # проверка зависимостей и конфигурации
npm run db:start       # локальный Supabase (нужен запущенный Docker Desktop)
npm run db:reset       # пересоздать БД: миграции + seed
npm run db:test        # pgTAP-тесты RLS и схемы
npm run db:types       # сгенерировать типы БД для клиента
```

Письма с кодом входа в локальном Supabase: http://127.0.0.1:54324. Seed-пользователи:
`admin@taza.test`, `coord1@taza.test`, `coord2@taza.test`, `vol1@taza.test` … `vol10@taza.test`,
`newbie@taza.test` (не в организации, с заявкой). Постоянное приглашение для разработки:
`/join/tazaqala-join-01`.

На Windows флаг dev-зависимости для `expo install` передаётся как `-- --dev`; проверяй, что пакет
попал в `devDependencies`.

## Код

- TypeScript strict + `noUncheckedIndexedAccess`; без `any` и без `@ts-ignore`.
- Импорты через алиас `@/` (= `src/`).
- zod-схемы в `features/*/schemas.ts` без зависимостей от React Native — их переиспользуют Edge Functions.
- Ошибки Supabase приводятся к кодам (`mapAuthError` и т.п.) и показываются через i18n, а не сырым текстом.
- Все строки интерфейса — через `t()`. Новый ключ добавляется сразу в `ru`, `kk` и `en`
  (тест `i18n-test` проверяет совпадение ключей и плейсхолдеров).
- Числа в текстах — в форме «Подпись: {{n}}» («Баллы: 221»), а не «{{n}} баллов»: окончания
  в русском зависят от числа. Длительность — только через `useFormatDuration()`.
- Баллы, опыт и достижения начисляет только триггер БД при подтверждении часов; значения
  формулы меняются миграцией в `points_rules` / `rating_multipliers` / `levels` вместе с
  `features/points/config.ts` и `features/benefit/levels.ts` (их сверяют тесты).
- Цвета — только из темы (`useTheme()`), не хардкодить. Новые пары текст/фон добавлять в
  `contrast-test` (WCAG AA ≥ 4.5).

## UI и доступность

- Координатор работает на улице в перчатках: основные кнопки ≥ 56 dp, остальные цели ≥ 48 dp.
- У интерактивных элементов есть `role` и понятный `aria-label`; состояние — через `aria-checked`,
  `aria-disabled`, `aria-busy` (не `accessibilityState`: в вебе он не доходит до экранного чтеца).
  Ошибки форм объявляются (`accessibilityRole="alert"` / `accessibilityLiveRegion`).
- Опасные действия (исключить, покинуть, отозвать) — `ConfirmButton` с подтверждением вторым
  нажатием, без системных диалогов.
- Поддерживать светлую и тёмную тему и системное увеличение шрифта.

## Тесты

- Jest (`jest-expo`) + React Native Testing Library 14: **`render` и `fireEvent` асинхронные — всегда `await`.**
- Файлы тестов: `__tests__/*-test.ts(x)` рядом с кодом.
- Нативные модули мокаются в `jest.setup.ts`.
- RLS и SQL-расчёты — pgTAP в `supabase/tests/database/*.test.sql`, каждый файл в `begin … rollback`.
  Вход под пользователем — `pg_temp.login_as(uuid)`; число затронутых строк — `pg_temp.affected(sql)`
  (RLS не бросает ошибку на UPDATE/DELETE, а просто фильтрует строки).

## Git

- Коммитить только по просьбе пользователя. Сообщения коммитов — на русском, кратко по сути.
- Не коммитить `.env`, ключи, нативные папки `android/`/`ios/` (генерируются через CNG).
