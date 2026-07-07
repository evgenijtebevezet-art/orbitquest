---
title: OrbitQuest — Product Bible
tags: [orbitquest, moc, product]
status: draft
---

# OrbitQuest

> Живая космическая игра об обслуживании знаний: официальные технологические сигналы становятся миссиями, навыки — спутниками, а обучение — восстановлением созвездия Atlas.

## Карта базы

- [[vision/Product-Vision|Видение продукта]]
- [[vision/Product-Principles|Принципы продукта]]
- [[learning/Learning-Loop|Цикл обучения]]
- [[learning/Placement-and-Routes|Диагностика и три маршрута]]
- [[learning/Knowledge-Graph|Живой граф знаний]]
- [[ai/AI-System|Роли искусственного интеллекта]]
- [[ai/Gemini-API-Strategy|Стратегия Gemini API Free Tier]]
- [[content/Source-Policy|Политика источников]]
- [[content/Freshness-Engine|Движок актуальности]]
- [[game/Game-Design|Игровая система]]
- [[game/World-and-Story|Мир и сюжет]]
- [[game/Prologue|Пролог и знакомство с миром]]
- [[game/Characters|Персонажи]]
- [[game/Season-1|Первый сезон]]
- [[game/Core-Loop|Игровой цикл]]
- [[product/UX-and-Screens|UX и экраны]]
- [[architecture/System-Architecture|Архитектура системы]]
- [[architecture/Data-Model|Модель данных]]
- [[architecture/Safety-and-Privacy|Безопасность и приватность]]
- [[product/MVP-Roadmap|MVP и дорожная карта]]
- [[product/Implementation-Plan|План реализации]]

## Архитектурные решения

- [[decisions/ADR-001-Web-PWA|ADR-001: Web/PWA вместо игрового движка]]
- [[decisions/ADR-002-Gemini-API-Only|ADR-002: Только Gemini API в runtime]]
- [[decisions/ADR-003-Game-World|ADR-003: Мир Atlas и serious-game подход]]

## Исследование

- [[research/Product-Research-2026-07|Глубокий продуктовый анализ]]

## Шаблоны

- [[templates/Lesson-Template|Шаблон урока]]
- [[templates/Update-Template|Шаблон технологического обновления]]

## Главная гипотеза

Статические курсы по AI coding устаревают быстрее, чем пользователь успевает их закончить. OrbitQuest хранит версионируемый граф знаний. Когда источник сообщает об изменении, система определяет затронутые навыки и создаёт delta-миссию: **что было → что изменилось → что делать теперь → как доказать понимание**.

## Первый пользователь

Первый пользователь — создатель продукта. Это позволяет сначала доказать полезность ежедневной миссии, качества источников и обновления знаний, не масштабируя слабый процесс.

## Визуальный прототип

![[assets/frontend-prototype.png]]

Этот скриншот зафиксирован как версия 1. Новый прототип должен выглядеть как мостик корабля и звёздная карта, а не аналитическая панель.
