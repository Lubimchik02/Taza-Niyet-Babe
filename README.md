# Taza Niyet

Приложение, которое делает волонтёрство осязаемым: подтверждённые часы, баллы, уровни, навыки
и сертификаты. React Native + Expo, бэкенд — Supabase.

> Статус: **этап 1 — каркас** (навигация, тема, i18n, подключение Supabase, вход по OTP).
> Полная инструкция появится на этапе 10.

## Запуск

Нужен Node.js 20+.

```bash
npm install
cp .env.example .env   # заполните URL и publishable key проекта Supabase
npm start              # затем: a — Android, i — iOS, w — браузер
```

Без `.env` приложение тоже запустится, но вход будет недоступен — экран входа это покажет.

Для входа по email в Supabase должен быть включён Email OTP; для входа по телефону — настроен
SMS-провайдер. Локальный Supabase и миграции появятся на этапе 2.

## Проверки

```bash
npm run check   # TypeScript + ESLint + Jest
```

Правила проекта — в [CLAUDE.md](CLAUDE.md), принятые решения — в [DECISIONS.md](DECISIONS.md).
