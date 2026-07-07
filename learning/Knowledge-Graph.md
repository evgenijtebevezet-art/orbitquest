---
tags: [learning, knowledge-graph, routes]
status: accepted
updated: 2026-07-07
---

# Живой граф знаний

## Назначение

Граф связывает цели, навыки, утверждения, источники, уроки, диагностические evidence и пользовательское состояние. Изменение одного API обновляет только затронутые claims и миссии.

## Основные сущности

- **Track** — направление, например AI Coding;
- **Sector** — крупная область внутри мира Atlas;
- **Skill** — проверяемая способность;
- **Concept** — понятие;
- **Claim** — versioned проверяемое утверждение;
- **Source** — первичный документ или release;
- **MissionCore** — канонический результат, evidence и tests;
- **MissionVariant** — `foundation`, `practice` или `delta`;
- **DiagnosticItem** — элемент входной проверки;
- **UserSkillProfile** — capability, mastery, confidence и freshness;
- **UpdateEvent** — внешнее изменение.

## Стартовый трек AI Coding

```text
AI Coding
├── Основы моделей
│   ├── инструкции и данные
│   ├── токены и контекст
│   ├── ограничения и ошибки
│   └── structured output
├── Работа с coding agents
│   ├── постановка задачи
│   ├── контекст репозитория
│   ├── tools и permissions
│   └── проверка результата
├── Agent systems
│   ├── MCP
│   ├── memory
│   ├── orchestration
│   └── human approval
├── Надёжность
│   ├── tests
│   ├── evals
│   ├── tracing
│   └── security
└── Production
    ├── стоимость
    ├── latency
    ├── caching
    └── privacy
```

## Два независимых состояния

### Capability пользователя

- `unknown` — не проверялся или отсутствует;
- `recognizes` — узнаёт и объясняет базовый смысл;
- `applies` — применяет в знакомом контексте;
- `transfers` — переносит и объясняет ограничения.

### Состояние знания в мире

- `stable` — claim актуален и навык подтверждён;
- `learning` — идёт миссия;
- `rusty` — нужна повторная практика;
- `changed` — связанный claim изменился;
- `deprecated` — подход больше не рекомендуется;
- `uncertain` — источники недостаточны или конфликтуют.

Capability и freshness не смешиваются. Senior может иметь `transfers`, но получить `changed` после release; новичок может иметь свежий материал, но capability `recognizes`.

## Выбор миссии

1. определить цель и сектор;
2. исключить недоступные prerequisites;
3. найти weakest relevant capability;
4. проверить review schedule;
5. проверить affected claims и freshness;
6. выбрать MissionCore;
7. выбрать route variant;
8. объяснить рекомендацию пользователю.

## Добавление темы

1. пользователь описывает цель;
2. система предлагает структуру;
3. редактор подтверждает первичные источники;
4. узлы без evidence получают `uncertain`;
5. пользователь утверждает маршрут;
6. диагностика определяет стартовую capability по узлам.

