---
tags: [mvp, roadmap, onboarding, routes]
status: accepted
updated: 2026-07-07
---

# MVP и дорожная карта

## Инкремент 1 — mobile shell

Статус: реализован.

- React/TypeScript PWA;
- typed bootstrap API;
- mobile Bridge, Atlas, Radar и Hangar;
- детерминированная машина демонстрационной миссии;
- localStorage и offline fallback;
- tests, typecheck, build и smoke.

Это технический каркас. Текущий вход сразу на Мостик временный и должен быть заменён прологом.

## Инкремент 2 — первый вход

Следующий обязательный этап:

1. [[game/Prologue]];
2. сохранение onboarding progress;
3. детерминированная диагностика;
4. capability по тестовым навыкам;
5. route recommendation;
6. Route Reveal;
7. переход к первой подходящей миссии.

**Критерий:** новый пользователь понимает Odyssey, KORA, Atlas, VEGA, PIX, собственную роль и причину выбранного маршрута без внешнего объяснения разработчика.

## Инкремент 3 — одна тема, три варианта

Создать один MissionCore `Tools and permissions`:

- `foundation` — объяснение и guided practice;
- `practice` — текущий сломанный handler;
- `delta` — migration/audit после versioned change.

Все варианты используют общие claims, acceptance criteria и tests.

**Критерий:** три диагностических профиля получают разные входы, но создают сопоставимое evidence.

## Инкремент 4 — Python sandbox

- lazy-loaded Pyodide module Worker;
- timeout и ограничение вывода;
- сеть выключена;
- mobile editor;
- versioned tests;
- client-verified evidence.

## Нулевая продуктовая версия — доказать цикл

- один пользователь;
- один трек AI Coding;
- пролог;
- диагностика и три маршрута;
- 8–12 ключевых skills;
- 3–5 вручную утверждённых MissionCore;
- ежедневная миссия;
- KORA, PIX и VEGA в своих функциональных ролях;
- локальное хранение;
- отчёт о полезности.

**Критерий:** минимум пять полезных сессий из семи без ручного переписывания миссии каждый день.

## MVP — живое обучение

- автоматический source ingestion;
- update detection;
- delta variants;
- review schedule;
- текстовый KORA Tutor;
- moderation flow VEGA;
- установка как PWA;
- внешний пилот после founder validation.

## V1 — практика

- больше Python-миссий;
- server-verified critical challenges;
- boss missions;
- пользовательские tracks;
- экспорт progress/evidence;
- feedback и dispute;
- TypeScript runtime только после отдельного решения.

## V2 — продукт для других

- multi-user auth;
- безопасная job queue;
- редакторская панель;
- оплачиваемые лимиты или BYOK;
- командные маршруты;
- marketplace проверенных tracks.

## Не делать в начале

- 3D-мир;
- PvP, leaderboard и социальную сеть;
- автоматическую публикацию generated lessons;
- приватные репозитории;
- глобальный профессиональный рейтинг;
- одновременную реализацию ACT-R, PFA и BKT;
- runtime image generation;
- native mobile приложения;
- несколько AI-провайдеров.

