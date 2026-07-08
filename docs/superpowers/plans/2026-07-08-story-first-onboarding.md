# Story-first Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Spec: `docs/superpowers/specs/2026-07-08-story-first-onboarding-design.md` (все решения там).

- [ ] T1. Контент: новый текст 7 сцен в `content/prologue/scenes.json` (дословно из чата 2026-07-08); intro_navigator.art → `scene-7-role`. validate:content зелёный.
- [ ] T2. Арт: сгенерённые kora/pix/vega портреты → `assets/characters/*.png`, сцена → `assets/prologue-scenes/scene-7-role.png`; `optimize-art.mjs` расширить (characters → 320px webp в `src/assets/characters/`); loader: `characterArt` map.
- [ ] T3. Упрощение слов: App.tsx (вкладки Играть/Карта навыков/Профиль, «Курс:», «Миссия на сегодня», CTA «Играть», статусы, «Сменить курс»), Calibration capNames, AtlasMap подписи по skillNames + availability wording.
- [ ] T4. Прогрессивное раскрытие: 0 завершённых миссий → после выбора сектора авто-вход в миссию дня; док скрыт при <1 завершённой; «Карта навыков»+«Профиль» появляются после первой (+одноразовая реплика KORA при completed==1); список миссий свёрнут под «Все миссии главы ▸».
- [ ] T5. Портреты в диалогах: пролог — аватар спикера у плашки; миссии — KORA в брифинге/подсказках/разборе, PIX в redTest.
- [ ] T6. Motion (`npm i motion -w web`, MotionConfig reducedMotion="user"): пролог ken-burns + построчные реплики + переход сцен; варианты stagger; shake при ошибке; pop вердикта; SFX-бабблы «БИП-БИП!»/«ОК!»/«СПУТНИК ОНЛАЙН!».
- [ ] T7. e2e-скрипт обновить под новые тексты/флоу (после сектора — сразу брифинг; док после первой миссии), 390×844+360×800; скриншоты; build/smoke/typecheck; merge+push+CI+прод-e2e.
