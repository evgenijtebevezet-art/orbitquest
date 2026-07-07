---
tags: [implementation, roadmap, mobile, pwa, onboarding]
status: accepted
updated: 2026-07-07
---

# OrbitQuest — план реализации

## Ограничения продукта

- mobile-first PWA, основной viewport `360–430px`;
- первый запуск всегда объясняет мир до первой миссии;
- маршрут не является профессиональным рангом;
- capability хранится по навыкам;
- Python — первый executable runtime;
- Gemini вызывается только backend и не выдаёт placement/code verdict;
- content publication требует evidence и human approval;
- `prototype/` остаётся визуальным референсом;
- Motion, Rive, generated assets и 3D не блокируют core loop.

## Архитектура

```text
Mobile PWA
├── Prologue state machine
├── Diagnostic and Route Reveal
├── game UI and offline cache
├── mission state machine
├── local event outbox
└── Pyodide Worker (later, lazy-loaded)
          │ HTTPS
          ▼
TypeScript API
├── bootstrap, onboarding and profile
├── deterministic placement
├── missions, attempts and progress
├── KORA / Gemini gateway
├── mastery and review schedule
└── VEGA moderation
          │
          ▼
Database + source snapshots + asset storage
```

## Реализовано

### Инкремент 1. Mobile foundation

- npm workspace;
- `apps/web`, `apps/api`, `packages/contracts`;
- responsive Bridge, Atlas, Radar и Hangar;
- typed bootstrap;
- offline fallback;
- deterministic demo mission;
- tests, typecheck, build и smoke.

Ограничение: пользователь временно попадает сразу на Мостик. Это заменяется следующим инкрементом.

## Следующий инкремент: первый вход

### 1. Контракты

Добавить:

- `OnboardingStep`;
- `OnboardingProgress`;
- `DiagnosticDefinition`;
- `DiagnosticResponse`;
- `Capability`;
- `LearningRoute`;
- `PlacementResult`;
- расширенный `BootstrapResponse`.

### 2. Prologue state machine

Реализовать состояния из [[game/Prologue]]:

```text
invitation → ship → kora → atlas → vega
→ pix → navigator → diagnostic → route_reveal → ready
```

Каждый шаг сохраняется локально. Skip сохраняет краткое знакомство с каноном, но не создаёт placement result.

### 3. Диагностика

- 5–8 seed items;
- deterministic scoring;
- confidence input;
- capability по тестовым skills;
- возможность `Не знаю`;
- pause/resume;
- unit tests scoring engine.

### 4. Route Reveal

- карта capability;
- объяснение рекомендации;
- ручной override;
- сохранение route source/reason;
- первая миссия соответствует выбранному варианту.

### 5. Mobile UX

- onboarding без постоянного HUD;
- одна primary action на экран;
- touch target минимум 44px;
- no horizontal overflow на 360px;
- reduced motion;
- отсутствие обязательного звука;
- back/reload не сбрасывает progress.

## После onboarding

### MissionCore и три variants

Одна тема `Tools and permissions` получает `foundation`, `practice` и `delta` варианты. Тесты и claims общие, scaffolding различается.

### Python sandbox

Pyodide загружается в module Worker только в Ангаре. Timeout завершает Worker. Сеть и доступ к DOM отсутствуют.

### Persistence

Local outbox → TypeScript API → SQLite dev → PostgreSQL pilot. Attempts идемпотентны.

### KORA

Structured Output, prompt versioning, progressive hints, timeout/quota control и offline PIX fallback. KORA не меняет placement/mastery напрямую.

### Delta Engine

Один официальный источник MCP: snapshot → diff → candidate → draft → tests → VEGA approval.

### Constellation

Capability, mastery и freshness проецируются на разные визуальные состояния. BKT добавляется после данных.

### Visual evolution

Сначала CSS/SVG/Canvas. Позже versioned generated assets и Rive states. Runtime generation не используется в обычной миссии.

## Проверка следующего инкремента

- [ ] новый профиль не видит Мостик до знакомства или явного skip;
- [ ] Odyssey однозначно представлен как корабль;
- [ ] KORA, VEGA и PIX появляются по очереди и объясняют только свою роль;
- [ ] диагностика не зависит от Gemini;
- [ ] три fixture-профиля получают ожидаемые маршруты;
- [ ] пользователь может override маршрут;
- [ ] progress восстанавливается после reload;
- [ ] mobile E2E проходит на 390×844 и 360×800;
- [ ] tests, typecheck, build и smoke проходят.

## MVP done

- [ ] PWA устанавливается на mobile;
- [ ] пролог и диагностика понятны без внешнего объяснения;
- [ ] один MissionCore работает в трёх вариантах;
- [ ] Python выполняется без блокировки UI;
- [ ] offline/Gemini quota не блокируют миссию;
- [ ] progress не дублируется;
- [ ] delta lesson показывает source/version;
- [ ] пять из семи founder sessions полезны.

