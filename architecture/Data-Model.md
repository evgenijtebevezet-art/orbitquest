---
tags: [architecture, data, diagnostic, routes]
status: accepted
updated: 2026-07-07
---

# Модель данных

## Идентичность и onboarding

```text
UserProfile
  id, display_name, locale, created_at

OnboardingProgress
  user_id, current_step, prologue_version, completed_at, skipped_at

UserGoal
  user_id, track_id, target, preferred_depth
```

Пропуск пролога не считается прохождением диагностики.

## Диагностика

```text
DiagnosticDefinition
  id, track_id, version, status

DiagnosticItem
  id, definition_id, skill_ids[], type, content, scoring_rule

DiagnosticSession
  id, user_id, definition_id, status, started_at, completed_at

DiagnosticResponse
  session_id, item_id, response, correct, confidence, duration_ms

PlacementResult
  session_id, recommended_route, explanation, scoring_version
```

PlacementResult создаётся детерминированным scoring engine. Model output не является источником route verdict.

## Профиль навыка

```text
UserSkillProfile
  user_id, skill_id
  capability: unknown | recognizes | applies | transfers
  mastery_score
  confidence_score
  freshness_score
  last_evidence_at
  next_review_at
  evidence_attempt_ids[]
```

Route хранится по track/sector, а не как неизменяемый глобальный ранг:

```text
UserRoute
  user_id, scope_type, scope_id
  route: foundation | practice | delta
  source: diagnostic | user_override | system_recommendation
  reason, updated_at
```

## Контент

```text
Source
  id, canonical_url, publisher, tier, fetched_at

SourceSnapshot
  id, source_id, content_hash, published_at, body, metadata

Claim
  id, statement, status, confidence, valid_from, valid_to, recheck_at

ClaimEvidence
  claim_id, snapshot_id, excerpt, relation

UpdateEvent
  id, type, title, impact, status, detected_at
```

## Миссии

```text
MissionCore
  id, skill_id, title, objective, prerequisites[]
  claim_ids[], acceptance_criteria[], transfer_criteria[]

MissionVariant
  id, mission_core_id
  route: foundation | practice | delta
  briefing, scaffolding_policy, exercise_ids[], duration_minutes

MissionVersion
  id, mission_variant_id, version, status, change_reason

MissionSession
  id, user_id, mission_version_id, status, started_at, completed_at

Attempt
  id, session_id, exercise_id, response
  evaluator_type, evaluator_version, result, duration_ms, hints_used

Evidence
  id, attempt_id, type, payload, strength
```

## Повторение

```text
ReviewSchedule
  user_id, skill_id, reason, due_at, policy_version
```

Reason различает `retention`, `transfer`, `changed_claim`, `diagnostic_gap` и `user_request`.

## Мир и персонажи

```text
WorldState
  user_id, ship_state, unlocked_decks[], active_sector

CharacterState
  user_id, character_id, introduced_at, state
```

WorldState проецирует обучение в интерфейс, но не является источником mastery.

## Инварианты

- KORA не назначает route verdict;
- пролог и диагностический балл независимы;
- маршрут объясним и может быть изменён пользователем;
- capability и freshness хранятся отдельно;
- claim без evidence не публикуется;
- mission version неизменяем после публикации;
- attempt хранит evaluator и version;
- code verdict не основывается только на модели;
- VEGA approval относится к контенту, а не к mastery пользователя;
- PIX test result подтверждает только acceptance criteria;
- embedding не является источником истины;
- удаление пользователя отделено от публичного контента.

