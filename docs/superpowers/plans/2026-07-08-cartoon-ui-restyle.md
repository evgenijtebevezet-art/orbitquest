# Cartoon UI Restyle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Перекрасить UI-обвязку OrbitQuest в утверждённый мульт-стиль (жирные контуры, жёсткие тени, палитра арта, шрифты Unbounded/Rubik/JetBrains Mono), удалив мёртвый CSS прототипа.

**Spec:** `docs/superpowers/specs/2026-07-08-cartoon-ui-restyle-design.md`

## Global Constraints
- Разметку/логику/тексты компонентов не менять — только CSS, импорты шрифтов, theme-color, манифест.
- Тач-цели ≥44px, код-блоки с внутренним скроллом, safe-area — сохраняются как есть.
- e2e 29/29 обязан остаться зелёным на 390×844 и 360×800.

### Task 1: Шрифты
- [ ] `npm install @fontsource/rubik @fontsource/unbounded @fontsource/jetbrains-mono -w @orbitquest/web`
- [ ] В `main.tsx` (до styles.css) импорт сабсетов: rubik latin+cyrillic 400/500/700; unbounded latin+cyrillic 600/800; jetbrains-mono latin+cyrillic 400.
- [ ] Проверить: `npm run build` — woff2 в dist, precache.json их видит.

### Task 2: styles.css — полная переписка
- [ ] Новые токены `:root` по спеке (палитра, --ink, --shadow-pop: 4px 4px 0 var(--ink)).
- [ ] Базовый слой: body фон #141028 + звёздная крапинка (radial-gradient dots), font-family Rubik; h1-h2 и .prologue-speaker/.rail-title/бейджи — Unbounded; код — JetBrains Mono.
- [ ] Примитивы: `.panel-pop` поведение вшить в существующие классы (option, mission-card, mission-row, sector-card, kora-brief, pix-note, kora-hint, skill-map li, atlas-detail, skip-block, calibration/prologue панели): fill var(--panel), border 3px var(--ink), border-radius 14px, box-shadow var(--shadow-pop).
- [ ] Кнопки действий (.prologue-action): заливка --acid, чёрный текст, контур+тень, :active translate(4px,4px)+shadow none. Вторичные (.option, .sector-card, .exit-button, .order-controls, .find-line): панельная заливка, при selected — цветная рамка по семантике.
- [ ] Крупные карточки (.mission-card, .prologue-panel, .calibration-screen>…, .atlas-detail): скошенный угол clip-path (polygon с срезом 18px верхнего правого) + «заклёпки» ::before на .mission-card/.kora-brief.
- [ ] Персонажные цвета: speaker-kora циан, speaker-pix/pix-note янтарь, speaker-vega зелёный, verdict pass=--acid-заливка 12%, fail=--amber; danger/import-error --danger.
- [ ] Код-блоки (.code-block, .order-line, .find-line): бизель — двойная рамка (ink + внутренняя #0a2416), фон #07130c, текст зеленоватый #baf5c8.
- [ ] Удалить мёртвые классы прототипа: space-window, stars, aurora, horizon, sector-tag, vega-signal, orbit, satellite*, solar, kora-unit, kora-orb, speech-panel, pix-unit/pix-body, mission-console, mission-summary, mission-glyph, route, status-strip, connection-pill, radar-view, hangar-view, repair-module, code-panel, sim-output, hint-panel, pix-face, run-button, map-cloud, map-caption, mini-kora, deck-enter-анимации прототипа (оставить те, что живые).
- [ ] Обновить `index.html` theme-color и `manifest.webmanifest` (background_color #141028, theme_color #0d0a1c) + `scripts/smoke.mjs` не проверяет цвета — ок.
- [ ] `npm run typecheck && npm run build && npm run smoke` зелёные.

### Task 3: Верификация и скриншоты
- [ ] `vite preview` + e2e-скрипт: 29/29 на 390×844 и 360×800.
- [ ] Playwright-скриншоты: пролог сц.1, калибровка, reveal, Мостик, задание с ошибкой (PIX+подсказка), Atlas — в scratchpad, показать владельцу.
- [ ] Commit + push (CI задеплоит на Pages).
