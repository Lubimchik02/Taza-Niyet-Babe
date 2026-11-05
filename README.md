# Taza Niyet

Приложение, которое делает волонтёрство осязаемым: подтверждённые часы, баллы, уровни, навыки
и сертификаты. React Native + Expo, бэкенд — Supabase.

> Статус: **этапы 1–3** — каркас приложения (навигация, тема, kk/ru/en, вход по коду), база данных
> (схема, RLS, seed, тесты политик) и организации (приглашения ссылкой и QR, заявки, роли).
> Полная инструкция появится на этапе 10.

## Запуск локально

Нужны Node.js 20+ и запущенный Docker Desktop.

```bash
npm install
npm run db:start   # локальный Supabase; первый запуск скачивает образы (~4 ГБ)
```

Создайте `.env` по образцу `.env.example`. URL — `http://127.0.0.1:54321`, publishable key
выводит команда `npx supabase status`.

```bash
npm start          # затем: a — Android, i — iOS, w — браузер
```

### Вход

Тестовые пользователи (из `supabase/seed.sql`):

| Роль            | Email                                  |
| --------------- | -------------------------------------- |
| Админ           | `admin@taza.test`                      |
| Координатор     | `coord1@taza.test`, `coord2@taza.test` |
| Волонтёр        | `vol1@taza.test` … `vol10@taza.test`   |
| Без организации | `newbie@taza.test` (подал заявку)      |

Код входа приходит в локальный почтовый ящик: http://127.0.0.1:54324.
Панель управления БД (Studio): http://127.0.0.1:54323.

## Проверки

```bash
npm run check     # TypeScript + ESLint + Jest
npm run db:test   # pgTAP: RLS, изоляция организаций, защита учёта часов
npm run db:reset  # пересоздать БД из миграций и seed
npm run db:types  # обновить типы БД после изменения схемы
```

Правила проекта — в [CLAUDE.md](CLAUDE.md), принятые решения — в [DECISIONS.md](DECISIONS.md).
