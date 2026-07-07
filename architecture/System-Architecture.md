---
tags: [architecture, system]
status: draft
---

# Архитектура системы

## Контуры

```text
Web/PWA
  │ HTTPS
API backend
  ├── Auth/Profile
  ├── Learning Engine
  ├── Mission Service
  ├── Content Service
  ├── AI Gateway → Gemini Developer API
  ├── Evaluation Service → sandbox workers
  └── Scheduler

Background ingestion
  ├── RSS/Atom
  ├── GitHub Releases/API
  ├── official docs/changelog
  └── normalization/dedupe

Storage
  ├── relational database
  ├── vector index
  ├── source snapshots
  └── artifacts
```

## MVP-модули

### Source Collector

Обычный HTTP-код. Не использует LLM для загрузки страниц. Соблюдает allowlist доменов, timeout, размер ответа и частоту запросов.

### Content Pipeline

Преобразует документ в source snapshot, извлекает кандидаты изменений, проверяет схему и создаёт draft.

### Learning Engine

Выбирает следующую миссию по mastery, целям, повторению и актуальности.

### AI Gateway

- скрывает API key;
- выбирает разрешённую модель;
- применяет JSON Schema;
- ограничивает токены и retries;
- пишет usage telemetry без содержимого приватных запросов;
- поддерживает graceful degradation.

### Evaluation Worker

Выполняет код отдельно от API backend. Ограничения: CPU, память, время, сеть, filesystem и размер вывода.

## Технологический вариант MVP

- frontend: React/Next.js PWA;
- backend: TypeScript;
- database: PostgreSQL в облаке, SQLite для локального прототипа;
- jobs: scheduler + queue;
- AI: Gemini Developer API;
- code editor: Monaco после подтверждения MVP;
- sandbox: отдельный worker/container, не основной процесс.

Новые production-зависимости добавляются только после отдельного решения.

