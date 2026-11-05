# Taza Niyet — правила проекта

Мобильное приложение для волонтёров: подтверждённые часы, баллы, навыки, сертификаты.
Полное задание: [PROMPT_Taza_Niyet.md](PROMPT_Taza_Niyet.md). Принятые решения: [DECISIONS.md](DECISIONS.md).
Особенности Expo SDK 58: [AGENTS.md](AGENTS.md) — **не полагайся на память об API Expo, сверяйся с документацией своей версии.**

## Главное

1. **Учёт часов — главное звено.** Часы нельзя накрутить и нельзя потерять. Любой код, касающийся
   check-in/check-out, расчёта часов и баллов, сначала покрывается тестами.
2. **Безопасность на сервере.** Права проверяет Postgres (RLS на _каждой_ таблице) и Edge Functions.
   Защита маршрутов в клиенте (`Stack.Protected`) — только UX, а не контроль доступа.
3. **Секреты не попадают в клиент и в git.** В приложении только `EXPO_PUBLIC_SUPABASE_URL` и
   publishable key. Service role / secret key — только в Edge Functions. `.env` в `.gitignore`.
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
  (app)/            вкладки после входа
  onboarding.tsx
src/features/<x>/   логика фичи: api.ts, schemas.ts (zod), сторы, components/, __tests__/
src/components/ui/  общие UI-компоненты (Button, TextField, AppText, Screen…)
src/theme/          палитра, токены, ThemeProvider (светлая/тёмная)
src/i18n/           locales/ru.ts — эталон; kk и en типизированы по нему
src/lib/            supabase, env, storage, query-client
supabase/           миграции, seed, тесты RLS, Edge Functions (с этапа 2)
```

## Команды

```bash
npm start              # dev-сервер Expo
npm run check          # typecheck + lint + тесты — запускать перед тем, как считать задачу готовой
npm test               # Jest
npx expo install <pkg> # ВСЕГДА вместо npm install для зависимостей приложения (совместимые версии)
npx expo-doctor        # проверка зависимостей и конфигурации
```

На Windows флаг dev-зависимости для `expo install` передаётся как `-- --dev`; проверяй, что пакет
попал в `devDependencies`.

## Код

- TypeScript strict + `noUncheckedIndexedAccess`; без `any` и без `@ts-ignore`.
- Импорты через алиас `@/` (= `src/`).
- zod-схемы в `features/*/schemas.ts` без зависимостей от React Native — их переиспользуют Edge Functions.
- Ошибки Supabase приводятся к кодам (`mapAuthError` и т.п.) и показываются через i18n, а не сырым текстом.
- Все строки интерфейса — через `t()`. Новый ключ добавляется сразу в `ru`, `kk` и `en`
  (тест `i18n-test` проверяет совпадение ключей и плейсхолдеров).
- Цвета — только из темы (`useTheme()`), не хардкодить. Новые пары текст/фон добавлять в
  `contrast-test` (WCAG AA ≥ 4.5).

## UI и доступность

- Координатор работает на улице в перчатках: основные кнопки ≥ 56 dp, остальные цели ≥ 48 dp.
- У интерактивных элементов есть `accessibilityRole` и понятный `accessibilityLabel`;
  ошибки форм объявляются (`accessibilityRole="alert"` / `accessibilityLiveRegion`).
- Поддерживать светлую и тёмную тему и системное увеличение шрифта.

## Тесты

- Jest (`jest-expo`) + React Native Testing Library 14: **`render` и `fireEvent` асинхронные — всегда `await`.**
- Файлы тестов: `__tests__/*-test.ts(x)` рядом с кодом.
- Нативные модули мокаются в `jest.setup.ts`.
- RLS и SQL-расчёты — pgTAP/SQL-тесты в `supabase/tests` (с этапа 2).

## Git

- Коммитить только по просьбе пользователя. Сообщения коммитов — на русском, кратко по сути.
- Не коммитить `.env`, ключи, нативные папки `android/`/`ios/` (генерируются через CNG).
