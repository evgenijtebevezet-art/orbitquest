# OrbitQuest Beginner Vertical Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полный играбельный путь первого игрока-новичка: пролог (6 сцен) → калибровка → выбор сектора → главы CODE-01..06 и AGENT-01..03 → карта Atlas, с кнопкой KORA (worker + фолбэк), версионированным профилем и деплоем PWA на GitHub Pages.

**Architecture:** React PWA (Vite, без игрового движка — конечные автоматы + CSS/SVG), контент как данные в `content/` по схеме из `packages/contracts` (бандлится в приложение через import), профиль в localStorage с экспортом/импортом, Cloudflare Worker для живой KORA с деградацией в «Бортовую справку».

**Tech Stack:** React 19, Vite 6, TypeScript 5.8, node:test (`--experimental-strip-types`), npm workspaces, Cloudflare Workers (без wrangler в deps), GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-07-08-beginner-vertical-slice-design.md` (канон: `game/Prologue.md`, `game/Characters.md`, `learning/Placement-and-Routes.md`).

## Global Constraints

- Node `>=22` (локально v24); тесты — `node --test --experimental-strip-types src/**/*.test.ts`.
- Все проверки заданий **детерминированы**; LLM не участвует в скоринге/маршруте.
- Мобильная спецификация: **никакого drag-and-drop** (переупорядочивание tap-кнопками «выше/ниже»), интерактивные элементы **≥ 44px**, код-блоки с внутренним горизонтальным скроллом (страница не скроллится вбок), safe-area (`viewport-fit=cover` уже стоит).
- Тон: взрослый, без «молодец!», без стриков с виной; брифинг ≤ 40 сек чтения и начинается с «зачем» (без лора в критериях); формулы речи персонажей по `game/Characters.md` (KORA: наблюдение → вопрос → шаг; PIX: короткий технический юмор, но не в критических сообщениях).
- Миссия **всегда завершается** (нет тупиков); попыток на задание максимум 3 (первая + две повторные); после исчерпания — разбор и дальше. Готовое решение до первой содержательной попытки не выдаётся.
- Кнопка «Спросить KORA» в заданиях активна только после ≥1 содержательной попытки; в брифинге — всегда.
- Capability: `unknown → recognizes → applies → transfers`; считается из evidence (тип задания × подсказки × contextTag), НЕ из факта прохождения миссии.
- Маршрут ≠ сектор: в v1 `route` всегда `"foundation"`, но хранится в профиле; калибровка выдаёт только рекомендацию сектора + skip-list.
- Профиль: `profileVersion` (=1) + `contentVersion`; импорт = replace с подтверждением; новее приложения → отказ; неизвестные ID при импорте сохраняются нетронутыми и не учитываются в прогрессе.
- В клиенте нет ключей LLM; правильные ответы в промпт воркера не передаются.
- Секреты не коммитятся; `git add` только явными путями (никогда `-A`).
- Пути PWA — только относительные (`./`), сайт живёт на project-pages `/<repo>/`.
- Коммит после каждой задачи; сообщения коротким английским `feat:/fix:/test:/content:/docs:/ci:`.

## File Structure (итоговая)

```text
packages/contracts/src/
  index.ts          # существующее + реэкспорт content.ts/profile.ts
  content.ts        # схема контента + валидаторы (NEW)
  content.test.ts   # (NEW)
  profile.ts        # схема профиля + миграции + валидатор (NEW)
  profile.test.ts   # (NEW)
apps/web/src/
  main.tsx          # (MOD: SW-путь, рендер Root)
  app/Root.tsx      # stage-роутер: prologue → calibration → reveal → main (NEW)
  App.tsx           # (MOD: палубы Мостик/Atlas/Профиль, реальные миссии)
  content/loader.ts # бандл-импорт content/ + карта арта (NEW)
  profile/storage.ts     # load/save/export/import поверх contracts (NEW)
  profile/storage.test.ts
  prologue/prologue.ts   # чистая машина сцен (NEW) + prologue.test.ts
  prologue/Prologue.tsx  # полноэкранный плеер сцен (NEW)
  diagnostic/scoring.ts  # детерминированный скоринг (NEW) + scoring.test.ts
  diagnostic/Calibration.tsx # калибровка + reveal + сектор (NEW)
  missions/engine.ts     # автомат миссии + checkAnswer + capability + планировщик (NEW)
  missions/engine.test.ts
  missions/MissionPlayer.tsx # плеер миссии + 5 рендереров заданий (NEW)
  atlas/AtlasMap.tsx     # созвездие из capability профиля (NEW)
  kora/askKora.ts        # клиент воркера + фолбэк (NEW) + askKora.test.ts
  assets/prologue/*.webp # оптимизированный арт (NEW, генерится скриптом)
content/
  index.json             # contentVersion + порядок миссий (NEW)
  prologue/scenes.json   # 6 сцен (NEW)
  calibration/items.json # 8 заданий калибровки (NEW)
  missions/code-0{1..6}.json, agent-0{1..3}.json (NEW)
scripts/
  validate-content.mjs   # CI-валидация контента (NEW)
  optimize-art.mjs       # assets/prologue-scenes → webp (NEW)
  smoke.mjs              # (MOD: относительные пути)
apps/kora-worker/
  package.json, src/guard.ts, src/prompt.ts, src/index.ts,
  src/guard.test.ts, src/prompt.test.ts, wrangler.toml,
  scripts/build-context.mjs  # kora-context.json без ключей ответов (NEW)
decisions/ADR-004-Runtime-LLM-NIM-Groq.md (NEW)
.github/workflows/deploy.yml (NEW)
```

---

### Task 1: Починить пути PWA под project-pages (известная поломка)

**Files:**
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/public/manifest.webmanifest`
- Modify: `apps/web/public/sw.js`
- Modify: `apps/web/index.html`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/data/bootstrap.ts`
- Modify: `scripts/smoke.mjs`

**Interfaces:**
- Produces: сборка, работающая с любого подпути (`base: "./"`); SW регистрируется относительно страницы; `/api/bootstrap` запрашивается только в dev.

- [ ] **Step 1: Обновить smoke под новые инварианты (это и есть failing test)**

В `scripts/smoke.mjs` заменить проверки manifest/index:

```js
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./");
assert.ok(manifest.icons.every((icon) => icon.src.startsWith("./")), "icons must be relative");

const index = await readFile(resolve(web, "index.html"), "utf8");
assert.match(index, /manifest\.webmanifest/);
assert.match(index, /viewport-fit=cover/);
assert.doesNotMatch(index, /(href|src)="\/(?!\/)/, "no root-absolute paths in index.html");

const sw = await readFile(resolve(web, "public/sw.js"), "utf8");
assert.doesNotMatch(sw, /"\/(?!\/)[^"]*"/, "no root-absolute paths in sw.js");

const viteConfig = await readFile(resolve(web, "vite.config.ts"), "utf8");
assert.match(viteConfig, /base:\s*"\.\/"/);
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `npm run build && npm run smoke`
Expected: FAIL на `start_url` (сейчас `"/"`).

- [ ] **Step 3: Внести исправления**

`vite.config.ts` — добавить `base: "./"` первым полем `defineConfig`.

`manifest.webmanifest`: `"start_url": "./"`, icon `"src": "./orbitquest-icon.svg"`.

`index.html`: `href="./orbitquest-icon.svg"`, `href="./manifest.webmanifest"`, `src="./src/main.tsx"`.

`sw.js` целиком:

```js
const CACHE = "orbitquest-shell-v2";
const SHELL = ["./", "./manifest.webmanifest", "./orbitquest-icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match("./"))),
  );
});
```

`main.tsx` — регистрация SW относительным путём:

```ts
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register(new URL("sw.js", window.location.href)),
  );
}
```

`data/bootstrap.ts` — сеть только в dev:

```ts
export async function loadBootstrap(signal?: AbortSignal): Promise<BootstrapResponse> {
  if (!import.meta.env.DEV) return offlineBootstrap;
  const response = await fetch("/api/bootstrap", { signal });
  ...
```

- [ ] **Step 4: Проверить зелёное**

Run: `npm run typecheck && npm test && npm run build && npm run smoke`
Expected: всё PASS; в `dist/index.html` пути начинаются с `./assets/`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/vite.config.ts apps/web/public/manifest.webmanifest apps/web/public/sw.js apps/web/index.html apps/web/src/main.tsx apps/web/src/data/bootstrap.ts scripts/smoke.mjs
git commit -m "fix: relative PWA paths for GitHub project pages"
```

---

### Task 2: Contracts — схема контента + валидаторы

**Files:**
- Create: `packages/contracts/src/content.ts`
- Create: `packages/contracts/src/content.test.ts`
- Modify: `packages/contracts/src/index.ts` (добавить `export * from "./content.ts";`)
- Modify: `packages/contracts/package.json` (script `"test": "node --test --experimental-strip-types src/**/*.test.ts"`)

**Interfaces:**
- Produces (используется ВСЕМИ последующими задачами):
  - типы `SectorId ("code"|"agent")`, `RouteId ("foundation"|"practice"|"delta")`, `Capability ("unknown"|"recognizes"|"applies"|"transfers")`, `TaskType`, `TaskOption`, `MissionTask`, `Mission`, `PrologueScene`, `CalibrationItem`, `ContentIndex`;
  - функции `validateMission(value: unknown): string[]`, `validatePrologueScenes(value: unknown): string[]`, `validateCalibrationItems(value: unknown): string[]`, `validateContentIndex(value: unknown): string[]` — пустой массив = валидно, иначе человекочитаемые ошибки с путём поля.

- [ ] **Step 1: Написать падающие тесты `content.test.ts`**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  validateMission, validateContentIndex, validateCalibrationItems, validatePrologueScenes,
} from "./content.ts";

const goodTask = {
  id: "t1", type: "choose-explanation", prompt: "Что такое программа?",
  options: [{ id: "a", label: "точная последовательность инструкций" }, { id: "b", label: "список пожеланий" }],
  answer: "a",
  hints: ["Наводящий вопрос?", "Направление.", "Разбор."],
  redTest: "Тест красный.", explain: "Разбор задания.",
};
const goodMission = {
  id: "code-01", code: "CODE-01", sector: "code", satelliteId: "CODE-01",
  skillId: "code.literal", title: "Буквальность машины",
  why: "Зачем: чтобы понимать, что машина делает ровно то, что написано.",
  briefing: ["KORA: наблюдение. Вопрос? Шаг."], durationMinutes: 12,
  contextTag: "familiar", tasks: [goodTask], koraFallback: "Смотри на строки по порядку.",
};

test("valid mission passes", () => assert.deepEqual(validateMission(goodMission), []));

test("mission with unknown answer id fails", () => {
  const bad = { ...goodMission, tasks: [{ ...goodTask, answer: "zzz" }] };
  assert.ok(validateMission(bad).some((e) => e.includes("answer")));
});

test("order-steps requires lines and initialOrder permutation", () => {
  const order = {
    ...goodTask, id: "t2", type: "order-steps", options: undefined, answer: "",
    lines: ["a = 2", "b = 3", "print(a + b)"], initialOrder: [2, 0, 1],
  };
  assert.deepEqual(validateMission({ ...goodMission, tasks: [order] }), []);
  const bad = { ...order, initialOrder: [0, 0, 1] };
  assert.ok(validateMission({ ...goodMission, tasks: [bad] }).some((e) => e.includes("initialOrder")));
});

test("find-error-line answer must be a valid 1-based line", () => {
  const find = {
    ...goodTask, id: "t3", type: "find-error-line", options: undefined,
    code: "print(1)\nprin(2)", answer: "2",
  };
  assert.deepEqual(validateMission({ ...goodMission, tasks: [find] }), []);
  assert.ok(
    validateMission({ ...goodMission, tasks: [{ ...find, answer: "9" }] })
      .some((e) => e.includes("answer")),
  );
});

test("content index validates order and version", () => {
  assert.deepEqual(validateContentIndex({
    contentVersion: "2026.07.08-1",
    missionOrder: { code: ["code-01"], agent: ["agent-01"] },
  }), []);
  assert.ok(validateContentIndex({ missionOrder: {} }).length > 0);
});

test("calibration items validate", () => {
  assert.deepEqual(validateCalibrationItems([{
    id: "q1", skillId: "code.literal", type: "choose-explanation",
    prompt: "Что напечатает print(\"2+2\")?",
    options: [{ id: "a", label: "2+2" }, { id: "b", label: "4" }],
    answer: "a", skipsMissionId: "code-01",
  }]), []);
  assert.ok(validateCalibrationItems([{ id: "q1" }]).length > 0);
});

test("prologue scenes validate", () => {
  assert.deepEqual(validatePrologueScenes([{
    id: "intro_invitation", art: "scene-1-invitation", title: "Приглашение Atlas",
    speaker: "ATLAS", paragraphs: ["ВХОДЯЩЕЕ ПОДКЛЮЧЕНИЕ"], actionLabel: "Принять подключение",
  }]), []);
  assert.ok(validatePrologueScenes([{ id: "x" }]).length > 0);
});
```

- [ ] **Step 2: Запустить, убедиться в падении**

Run: `npm test --workspace @orbitquest/contracts`
Expected: FAIL — `content.ts` не существует.

- [ ] **Step 3: Реализовать `content.ts`**

```ts
export const sectorIds = ["code", "agent"] as const;
export type SectorId = (typeof sectorIds)[number];

export const routeIds = ["foundation", "practice", "delta"] as const;
export type RouteId = (typeof routeIds)[number];

export const capabilityLevels = ["unknown", "recognizes", "applies", "transfers"] as const;
export type Capability = (typeof capabilityLevels)[number];

export const taskTypes = [
  "choose-explanation", "predict-output", "order-steps", "find-error-line", "spot-diff",
] as const;
export type TaskType = (typeof taskTypes)[number];

export interface TaskOption { id: string; label: string }

export interface MissionTask {
  id: string;
  type: TaskType;
  prompt: string;
  code?: string;
  codeB?: string; // spot-diff: вторая версия кода
  options?: TaskOption[]; // choose-explanation | predict-output | spot-diff
  lines?: string[]; // order-steps: строки в ПРАВИЛЬНОМ порядке
  initialOrder?: number[]; // order-steps: стартовая перестановка индексов lines
  answer: string; // id опции | номер строки (1-based строкой); для order-steps ""
  hints: [string, string, string]; // 1 наводящий вопрос, 2 направление, 3 разбор
  redTest: string; // реплика PIX при ошибке (факт, без осуждения)
  explain: string; // разбор (после исчерпания попыток и после верного ответа)
  proof?: boolean; // финальное задание-доказательство
}

export interface Mission {
  id: string;
  code: string;
  sector: SectorId;
  satelliteId: string;
  skillId: string;
  title: string;
  why: string;
  briefing: string[];
  durationMinutes: number;
  contextTag: "familiar" | "new";
  tasks: MissionTask[];
  koraFallback: string;
}

export interface PrologueScene {
  id: string;
  art: string;
  title: string;
  speaker: "ATLAS" | "SYSTEM" | "KORA" | "VEGA" | "PIX";
  paragraphs: string[];
  actionLabel: string;
  nameInput?: boolean;
}

export interface CalibrationItem {
  id: string;
  skillId: string;
  type: "choose-explanation" | "predict-output";
  prompt: string;
  code?: string;
  options: TaskOption[];
  answer: string;
  skipsMissionId?: string;
}

export interface ContentIndex {
  contentVersion: string;
  missionOrder: Record<SectorId, string[]>;
}
```

Валидаторы — ручные, без зависимостей. Каркас:

```ts
type Check = (errors: string[]) => void;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}
function pushIf(errors: string[], cond: boolean, message: string) {
  if (cond) errors.push(message);
}

export function validateTask(value: unknown, path: string): string[] {
  const errors: string[] = [];
  const t = value as Partial<MissionTask>;
  pushIf(errors, !isNonEmptyString(t?.id), `${path}.id: required`);
  pushIf(errors, !taskTypes.includes(t?.type as TaskType), `${path}.type: one of ${taskTypes.join("|")}`);
  pushIf(errors, !isNonEmptyString(t?.prompt), `${path}.prompt: required`);
  pushIf(errors, !Array.isArray(t?.hints) || t.hints.length !== 3 || !t.hints.every(isNonEmptyString),
    `${path}.hints: exactly 3 non-empty strings`);
  pushIf(errors, !isNonEmptyString(t?.redTest), `${path}.redTest: required`);
  pushIf(errors, !isNonEmptyString(t?.explain), `${path}.explain: required`);

  if (t?.type === "order-steps") {
    const lines = t.lines ?? [];
    const order = t.initialOrder ?? [];
    pushIf(errors, lines.length < 2, `${path}.lines: >=2 lines required`);
    const isPermutation = order.length === lines.length &&
      [...order].sort((a, b) => a - b).every((v, i) => v === i);
    pushIf(errors, !isPermutation, `${path}.initialOrder: must be a permutation of 0..${lines.length - 1}`);
    const isIdentity = order.every((v, i) => v === i);
    pushIf(errors, order.length > 0 && isIdentity, `${path}.initialOrder: must actually shuffle`);
  } else if (t?.type === "find-error-line") {
    const lineCount = (t.code ?? "").split("\n").length;
    pushIf(errors, !isNonEmptyString(t?.code), `${path}.code: required`);
    const n = Number(t?.answer);
    pushIf(errors, !Number.isInteger(n) || n < 1 || n > lineCount,
      `${path}.answer: 1-based line number within code (1..${lineCount})`);
  } else {
    const options = t?.options ?? [];
    pushIf(errors, options.length < 2, `${path}.options: >=2 required`);
    pushIf(errors, options.some((o) => !isNonEmptyString(o?.id) || !isNonEmptyString(o?.label)),
      `${path}.options: id and label required`);
    pushIf(errors, new Set(options.map((o) => o.id)).size !== options.length, `${path}.options: duplicate ids`);
    pushIf(errors, !options.some((o) => o.id === t?.answer), `${path}.answer: must match an option id`);
    if (t?.type === "spot-diff") pushIf(errors, !isNonEmptyString(t?.codeB), `${path}.codeB: required for spot-diff`);
    if (t?.type === "predict-output" || t?.type === "spot-diff")
      pushIf(errors, !isNonEmptyString(t?.code), `${path}.code: required`);
  }
  return errors;
}
```

`validateMission` проверяет верхний уровень (все обязательные строки, `sector` ∈ sectorIds, `contextTag` ∈ familiar|new, `briefing` — непустой массив непустых строк, `1 <= tasks.length <= 5`, уникальность `tasks[].id`, ровно ≤1 задание с `proof: true` и оно последнее, `durationMinutes` 5..25) и конкатенирует `validateTask` по всем заданиям. `validateContentIndex` — `contentVersion` непустая строка, `missionOrder.code`/`missionOrder.agent` — массивы непустых строк без дублей. `validateCalibrationItems` — массив 6..8 элементов, поля как в интерфейсе, `answer` ∈ options, уникальные id. `validatePrologueScenes` — массив ровно из 6+1 сцен не требуем: 6..7 сцен (6 арт-сцен + текстовая сцена роли), поля обязательны, `speaker` ∈ перечислению, id уникальны и начинаются с `intro_`.

В `index.ts` добавить `export * from "./content.ts";` (расширение `.ts` обязательно — так уже импортирует web).

- [ ] **Step 4: Прогнать тесты**

Run: `npm test --workspace @orbitquest/contracts`
Expected: PASS (7 тестов). Затем `npm run typecheck` — PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/content.ts packages/contracts/src/content.test.ts packages/contracts/src/index.ts packages/contracts/package.json
git commit -m "feat(contracts): content schema and validators"
```

---

### Task 3: Contracts — схема профиля, миграции, правила импорта

**Files:**
- Create: `packages/contracts/src/profile.ts`
- Create: `packages/contracts/src/profile.test.ts`
- Modify: `packages/contracts/src/index.ts` (добавить `export * from "./profile.ts";`)

**Interfaces:**
- Consumes: `Capability`, `SectorId`, `RouteId` из `content.ts`.
- Produces:
  - `PROFILE_VERSION = 1`;
  - типы `AttemptRecord { taskId: string; answerKey: string; correct: boolean; hintStage: 0|1|2|3; at: string }`, `MissionRecord { missionId: string; status: "in-progress"|"completed"; attempts: AttemptRecord[]; completedAt?: string; nextReviewAt?: string }`, `CalibrationAnswer { itemId: string; choiceId: string; confident: boolean }` (`choiceId === "dont-know"` — честное «не знаю»), `CalibrationResult { capabilities: Record<string, Capability>; recommendedSector: SectorId; skipMissionIds: string[] }`, `Profile`;
  - `createProfile(contentVersion: string): Profile` — новый пустой профиль;
  - `parseProfile(raw: unknown, appContentVersion: string): { ok: true; profile: Profile; contentMismatch: boolean } | { ok: false; error: string }` — валидация + миграции + правила версий.

- [ ] **Step 1: Тесты `profile.test.ts`**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createProfile, parseProfile, PROFILE_VERSION } from "./profile.ts";

test("createProfile starts before prologue", () => {
  const p = createProfile("2026.07.08-1");
  assert.equal(p.profileVersion, PROFILE_VERSION);
  assert.equal(p.prologueDone, false);
  assert.equal(p.prologueSceneIndex, 0);
  assert.equal(p.sector, null);
  assert.equal(p.route, "foundation");
  assert.deepEqual(p.missions, {});
});

test("roundtrip: freshly created profile parses ok", () => {
  const p = createProfile("v1");
  const parsed = parseProfile(JSON.parse(JSON.stringify(p)), "v1");
  assert.ok(parsed.ok);
  if (parsed.ok) assert.equal(parsed.contentMismatch, false);
});

test("newer profileVersion is rejected with readable error", () => {
  const p = { ...createProfile("v1"), profileVersion: PROFILE_VERSION + 1 };
  const parsed = parseProfile(p, "v1");
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.match(parsed.error, /новее/);
});

test("different contentVersion keeps unknown mission records untouched", () => {
  const p = createProfile("old-content");
  p.missions["ghost-99"] = { missionId: "ghost-99", status: "completed", attempts: [] };
  const parsed = parseProfile(JSON.parse(JSON.stringify(p)), "new-content");
  assert.ok(parsed.ok);
  if (parsed.ok) {
    assert.equal(parsed.contentMismatch, true);
    assert.ok(parsed.profile.missions["ghost-99"], "unknown records preserved");
  }
});

test("garbage input fails schema validation", () => {
  assert.equal(parseProfile({ hello: 1 }, "v1").ok, false);
  assert.equal(parseProfile("not an object", "v1").ok, false);
});

// fixture-тест миграции: v1 → v1 (identity). При bump до v2 сюда добавляется
// fixture старого профиля и проверка результата миграции.
test("migration chain reaches current version", () => {
  const fixtureV1 = createProfile("v1");
  const parsed = parseProfile(JSON.parse(JSON.stringify(fixtureV1)), "v1");
  assert.ok(parsed.ok);
  if (parsed.ok) assert.equal(parsed.profile.profileVersion, PROFILE_VERSION);
});
```

- [ ] **Step 2: Запустить — FAIL (нет profile.ts)**

Run: `npm test --workspace @orbitquest/contracts`

- [ ] **Step 3: Реализовать `profile.ts`**

```ts
import type { Capability, RouteId, SectorId } from "./content.ts";

export const PROFILE_VERSION = 1;

export interface AttemptRecord {
  taskId: string;
  answerKey: string;
  correct: boolean;
  hintStage: 0 | 1 | 2 | 3;
  at: string; // ISO
}

export interface MissionRecord {
  missionId: string;
  status: "in-progress" | "completed";
  attempts: AttemptRecord[];
  completedAt?: string;
  nextReviewAt?: string;
}

export interface CalibrationAnswer {
  itemId: string;
  choiceId: string; // "dont-know" = честное «не знаю»
  confident: boolean;
}

export interface CalibrationResult {
  capabilities: Record<string, Capability>;
  recommendedSector: SectorId;
  skipMissionIds: string[];
}

export interface Profile {
  profileVersion: number;
  contentVersion: string;
  navigatorName: string;
  prologueSceneIndex: number;
  prologueDone: boolean;
  calibration: {
    answers: CalibrationAnswer[];
    result: CalibrationResult | null;
    done: boolean;
    skipsOverridden: boolean; // игрок выбрал «пройти всё подряд»
  };
  sector: SectorId | null;
  route: RouteId; // v1: всегда foundation, измерение независимо от сектора
  missions: Record<string, MissionRecord>; // неизвестные ID никогда не удаляются
}

export function createProfile(contentVersion: string): Profile {
  return {
    profileVersion: PROFILE_VERSION,
    contentVersion,
    navigatorName: "",
    prologueSceneIndex: 0,
    prologueDone: false,
    calibration: { answers: [], result: null, done: false, skipsOverridden: false },
    sector: null,
    route: "foundation",
    missions: {},
  };
}

// Миграции: ключ N — функция, поднимающая профиль с версии N до N+1.
// На каждый bump PROFILE_VERSION сюда добавляется функция + fixture-тест.
const migrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

function validateShape(raw: Record<string, unknown>): string | null {
  if (typeof raw.contentVersion !== "string") return "contentVersion: string required";
  if (typeof raw.navigatorName !== "string") return "navigatorName: string required";
  if (typeof raw.prologueSceneIndex !== "number") return "prologueSceneIndex: number required";
  if (typeof raw.prologueDone !== "boolean") return "prologueDone: boolean required";
  const cal = raw.calibration as Record<string, unknown> | undefined;
  if (!cal || !Array.isArray(cal.answers) || typeof cal.done !== "boolean") return "calibration: invalid";
  if (raw.sector !== null && raw.sector !== "code" && raw.sector !== "agent") return "sector: invalid";
  if (!raw.missions || typeof raw.missions !== "object") return "missions: object required";
  for (const [id, rec] of Object.entries(raw.missions as Record<string, unknown>)) {
    const r = rec as Record<string, unknown>;
    if (!r || r.missionId !== id || !Array.isArray(r.attempts)) return `missions.${id}: invalid record`;
    if (r.status !== "in-progress" && r.status !== "completed") return `missions.${id}.status: invalid`;
  }
  return null;
}

export function parseProfile(
  raw: unknown,
  appContentVersion: string,
): { ok: true; profile: Profile; contentMismatch: boolean } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Файл не похож на профиль OrbitQuest." };
  }
  let data = { ...(raw as Record<string, unknown>) };
  const version = data.profileVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: "В файле нет корректного profileVersion." };
  }
  if (version > PROFILE_VERSION) {
    return {
      ok: false,
      error: `Профиль создан более новой версией OrbitQuest (v${version}, приложение v${PROFILE_VERSION}). Обнови приложение.`,
    };
  }
  for (let v = version; v < PROFILE_VERSION; v += 1) {
    const migrate = migrations[v];
    if (!migrate) return { ok: false, error: `Нет миграции с версии ${v}.` };
    data = migrate(data);
  }
  data.profileVersion = PROFILE_VERSION;
  const shapeError = validateShape(data);
  if (shapeError) return { ok: false, error: `Профиль не прошёл проверку: ${shapeError}` };
  const profile = data as unknown as Profile;
  const contentMismatch = profile.contentVersion !== appContentVersion;
  return { ok: true, profile, contentMismatch };
}
```

В `index.ts` добавить `export * from "./profile.ts";`.

- [ ] **Step 4: Прогнать**

Run: `npm test --workspace @orbitquest/contracts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/profile.ts packages/contracts/src/profile.test.ts packages/contracts/src/index.ts
git commit -m "feat(contracts): versioned profile schema with migration chain"
```

---

### Task 4: Контент пролога + оптимизация арта

**Files:**
- Create: `content/index.json`
- Create: `content/prologue/scenes.json`
- Create: `scripts/optimize-art.mjs`
- Create: `apps/web/src/assets/prologue/*.webp` (генерятся скриптом)
- Modify: `package.json` (root; devDep `sharp`, script `"art": "node scripts/optimize-art.mjs"`)

**Interfaces:**
- Produces: `content/index.json` с `contentVersion: "2026.07.08-1"` и `missionOrder` (миссии появятся в задачах 10–11, порядок фиксируем сейчас); `scenes.json` — 7 сцен (6 с артом + текстовая сцена роли Навигатора, `art` у неё повторяет сцену 2); webp ≤ 300KB каждый.

- [ ] **Step 1: `content/index.json`**

```json
{
  "contentVersion": "2026.07.08-1",
  "missionOrder": {
    "code": ["code-01", "code-02", "code-03", "code-04", "code-05", "code-06"],
    "agent": ["agent-01", "agent-02", "agent-03"]
  }
}
```

- [ ] **Step 2: `content/prologue/scenes.json` — полный текст по `game/Prologue.md`**

```json
[
  {
    "id": "intro_invitation",
    "art": "scene-1-invitation",
    "title": "Приглашение Atlas",
    "speaker": "ATLAS",
    "paragraphs": [
      "ВХОДЯЩЕЕ ПОДКЛЮЧЕНИЕ · ATLAS CONTROL",
      "Исследовательский корабль NQ-07 запрашивает Навигатора."
    ],
    "actionLabel": "Принять подключение"
  },
  {
    "id": "intro_ship",
    "art": "scene-2-bridge-wakeup",
    "title": "Корабль Odyssey",
    "speaker": "SYSTEM",
    "paragraphs": [
      "ODYSSEY NQ-07 / «ОДИССЕЙ». Исследовательский корабль обслуживания орбитальной сети Atlas.",
      "Большая часть корабля находится в режиме ожидания. Палубы будут возвращаться в строй вместе с восстановлением систем."
    ],
    "actionLabel": "Включить питание, связь и навигацию"
  },
  {
    "id": "intro_kora",
    "art": "scene-3-kora-intro",
    "title": "KORA",
    "speaker": "KORA",
    "paragraphs": [
      "Подключение подтверждено. Я KORA — корабельный навигатор и система восстановления знаний.",
      "Я могу объяснять, строить маршруты и находить пробелы. Но я не имею права подтверждать собственные выводы. Для этого Odyssey нужен человек.",
      "Как к тебе обращаться, Навигатор?"
    ],
    "actionLabel": "Назвать себя",
    "nameInput": true
  },
  {
    "id": "intro_atlas",
    "art": "scene-4-atlas-shift",
    "title": "Atlas и Сдвиг",
    "speaker": "KORA",
    "paragraphs": [
      "Atlas — орбитальная сеть знаний Земли. Каждый спутник хранит проверяемый навык, его источники и практические доказательства.",
      "Технологии изменяются быстрее, чем сеть обновляет связи. Эта рассинхронизация называется Сдвигом.",
      "CODE-01 · Состояние: связь не установлена. Причина: сектор ждёт своего Навигатора."
    ],
    "actionLabel": "Осмотреть нестабильный спутник"
  },
  {
    "id": "intro_vega",
    "art": "scene-5-vega-call",
    "title": "VEGA",
    "speaker": "VEGA",
    "paragraphs": [
      "Odyssey, это Центр управления Atlas. На связи VEGA.",
      "Я проверяю источники и отделяю реальные изменения от информационного шума. KORA объяснит сигнал, но сначала я подтверждаю его происхождение."
    ],
    "actionLabel": "Открыть подтверждённый источник"
  },
  {
    "id": "intro_pix",
    "art": "scene-6-pix-hangar",
    "title": "PIX",
    "speaker": "PIX",
    "paragraphs": [
      "PIX: Новый Навигатор. Старый спутник. Красные тесты. Обычный рабочий день.",
      "KORA: PIX управляет симулятором и проверяет практический результат.",
      "PIX: KORA объясняет. Я запускаю. Тесты решают, кто был прав."
    ],
    "actionLabel": "Запустить демонстрационную диагностику"
  },
  {
    "id": "intro_navigator",
    "art": "scene-2-bridge-wakeup",
    "title": "Роль Навигатора",
    "speaker": "KORA",
    "paragraphs": [
      "VEGA подтверждает источник. Я помогаю понять изменение. PIX проверяет результат.",
      "Но только Навигатор может применить знание и доказать, что оно действительно освоено.",
      "Сначала я откалибрую системы под тебя. Вопросы прозрачные; честное «не знаю» — тоже ответ."
    ],
    "actionLabel": "Начать калибровку Навигатора"
  }
]
```

- [ ] **Step 3: `scripts/optimize-art.mjs`**

```js
import { readdir, mkdir, stat } from "node:fs/promises";
import { resolve, basename } from "node:path";
import sharp from "sharp";

const src = resolve(import.meta.dirname, "../assets/prologue-scenes");
const out = resolve(import.meta.dirname, "../apps/web/src/assets/prologue");
await mkdir(out, { recursive: true });

for (const file of (await readdir(src)).filter((f) => f.endsWith(".png"))) {
  const target = resolve(out, `${basename(file, ".png")}.webp`);
  await sharp(resolve(src, file)).resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 80 }).toFile(target);
  const { size } = await stat(target);
  console.log(`${basename(target)} ${(size / 1024).toFixed(0)}KB`);
  if (size > 300 * 1024) throw new Error(`${basename(target)} exceeds 300KB`);
}
console.log("art optimized");
```

- [ ] **Step 4: Установить sharp и прогнать**

Run: `npm install -D sharp && npm run art`
Expected: 6 webp в `apps/web/src/assets/prologue/`, каждый ≤300KB. Диск у владельца маленький — sharp ставим только как devDep, `node_modules` не коммитим.

- [ ] **Step 5: Commit**

```bash
git add content/index.json content/prologue/scenes.json scripts/optimize-art.mjs package.json package-lock.json apps/web/src/assets/prologue
git commit -m "content: prologue scenes, content index, art pipeline"
```

---

### Task 5: Скрипт валидации контента (CI-гейт)

**Files:**
- Create: `scripts/validate-content.mjs`
- Modify: `package.json` (root; script `"validate:content": "node scripts/validate-content.mjs"`)

**Interfaces:**
- Consumes: валидаторы из `@orbitquest/contracts` (импорт напрямую из исходника: `packages/contracts/src/content.ts` через `--experimental-strip-types` нельзя в .mjs — поэтому импортируем через `node --experimental-strip-types` запуск, см. ниже);
- Produces: exit 1 + список ошибок, если хоть один файл контента невалиден или миссия из `missionOrder` отсутствует на диске (отсутствие файла миссии до задач 10–11 — допускается предупреждением `MISSING (pending)`, падение только на невалидных существующих файлах; после задачи 11 отсутствие = ошибка через флаг `--strict`).

- [ ] **Step 1: Написать скрипт**

```js
// запуск: node --experimental-strip-types scripts/validate-content.mjs [--strict]
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";
import {
  validateContentIndex, validatePrologueScenes, validateCalibrationItems, validateMission,
} from "../packages/contracts/src/content.ts";

const root = resolve(import.meta.dirname, "..");
const strict = process.argv.includes("--strict");
const failures = [];

async function check(path, validate) {
  const raw = JSON.parse(await readFile(resolve(root, path), "utf8"));
  const errors = validate(raw);
  if (errors.length) failures.push(`${path}:\n  ${errors.join("\n  ")}`);
  return raw;
}

const index = await check("content/index.json", validateContentIndex);
await check("content/prologue/scenes.json", validatePrologueScenes);
try {
  await access(resolve(root, "content/calibration/items.json"));
  await check("content/calibration/items.json", validateCalibrationItems);
} catch { if (strict) failures.push("content/calibration/items.json: MISSING"); else console.warn("calibration: MISSING (pending)"); }

for (const id of [...index.missionOrder.code, ...index.missionOrder.agent]) {
  const path = `content/missions/${id}.json`;
  try {
    await access(resolve(root, path));
    const mission = await check(path, validateMission);
    if (mission.id !== id) failures.push(`${path}: id "${mission.id}" != filename "${id}"`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    if (strict) failures.push(`${path}: MISSING`); else console.warn(`${path}: MISSING (pending)`);
  }
}

if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("content valid");
```

В root `package.json`: `"validate:content": "node --experimental-strip-types scripts/validate-content.mjs"`.

- [ ] **Step 2: Проверить, что ловит ошибку (ручной negative-тест)**

Временно испортить `content/prologue/scenes.json` (удалить `actionLabel` первой сцены), запустить `npm run validate:content` → Expected: exit 1 с ошибкой пути. Вернуть файл (`git checkout -- content/prologue/scenes.json`).

- [ ] **Step 3: Зелёный прогон**

Run: `npm run validate:content`
Expected: `calibration: MISSING (pending)`, предупреждения по миссиям, `content valid`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-content.mjs package.json
git commit -m "feat: content validation script (CI gate)"
```

---

### Task 6: Хранилище профиля в web + загрузчик контента

**Files:**
- Create: `apps/web/src/profile/storage.ts`
- Create: `apps/web/src/profile/storage.test.ts`
- Create: `apps/web/src/content/loader.ts`
- Modify: `apps/web/tsconfig.app.json` (убедиться `"resolveJsonModule": true`; если нет — добавить в compilerOptions)

**Interfaces:**
- Consumes: `createProfile`, `parseProfile`, `Profile` из contracts; `content/index.json`, `content/prologue/scenes.json` (статический импорт).
- Produces:
  - `loader.ts`: `contentIndex: ContentIndex`, `prologueScenes: PrologueScene[]`, `missionsById: Record<string, Mission>`, `calibrationItems: CalibrationItem[]`, `prologueArt: Record<string, string>` (ключ арта → URL). До задач 7/10 `missionsById`/`calibrationItems` собираются через `import.meta.glob` и просто пустые.
  - `storage.ts`: `loadProfile(): Profile` (localStorage `orbitquest:profile`; мусор/несовместимость → новый профиль, старый бэкапится в `orbitquest:profile:backup`); `saveProfile(profile): void`; `exportProfile(profile): string` (pretty JSON); `importProfile(json: string): { ok: true; profile: Profile; contentMismatch: boolean } | { ok: false; error: string }`.

- [ ] **Step 1: Тесты `storage.test.ts`** (node:test; localStorage мокается объектом `globalThis.localStorage = { getItem, setItem, removeItem }` поверх Map — в начале файла)

```ts
import assert from "node:assert/strict";
import test from "node:test";

const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { loadProfile, saveProfile, exportProfile, importProfile } = await import("./storage.ts");

test("loadProfile returns fresh profile when storage is empty", () => {
  store.clear();
  const p = loadProfile();
  assert.equal(p.prologueDone, false);
});

test("save/load roundtrip", () => {
  store.clear();
  const p = loadProfile();
  p.navigatorName = "Гento";
  saveProfile(p);
  assert.equal(loadProfile().navigatorName, "Гento");
});

test("corrupted storage is backed up and replaced", () => {
  store.clear();
  store.set("orbitquest:profile", "{broken json");
  const p = loadProfile();
  assert.equal(p.prologueDone, false);
  assert.equal(store.get("orbitquest:profile:backup"), "{broken json");
});

test("import rejects newer profileVersion, accepts valid export", () => {
  store.clear();
  const p = loadProfile();
  const exported = exportProfile(p);
  const good = importProfile(exported);
  assert.ok(good.ok);
  const bad = importProfile(exported.replace('"profileVersion": 1', '"profileVersion": 99'));
  assert.equal(bad.ok, false);
});
```

- [ ] **Step 2: FAIL прогон** — `npm test --workspace @orbitquest/web`

- [ ] **Step 3: Реализация**

`loader.ts` (импорт вне root Vite разрешён — workspace root):

```ts
import type { CalibrationItem, ContentIndex, Mission, PrologueScene } from "@orbitquest/contracts";
import contentIndexJson from "../../../../content/index.json";
import prologueScenesJson from "../../../../content/prologue/scenes.json";

export const contentIndex = contentIndexJson as ContentIndex;
export const prologueScenes = prologueScenesJson as PrologueScene[];

const missionModules = import.meta.glob("../../../../content/missions/*.json", { eager: true, import: "default" });
export const missionsById: Record<string, Mission> = Object.fromEntries(
  Object.values(missionModules).map((m) => [(m as Mission).id, m as Mission]),
);

const calibrationModules = import.meta.glob("../../../../content/calibration/items.json", { eager: true, import: "default" });
export const calibrationItems: CalibrationItem[] =
  (Object.values(calibrationModules)[0] as CalibrationItem[] | undefined) ?? [];

const artModules = import.meta.glob("../assets/prologue/*.webp", { eager: true, query: "?url", import: "default" });
export const prologueArt: Record<string, string> = Object.fromEntries(
  Object.entries(artModules).map(([path, url]) => [path.split("/").pop()!.replace(".webp", ""), url as string]),
);
```

`storage.ts` — ключи `orbitquest:profile` / `orbitquest:profile:backup`; `loadProfile` пробует `JSON.parse` + `parseProfile(raw, contentIndex.contentVersion)`; любой сбой → backup + `createProfile(contentIndex.contentVersion)` + save. Но loader тянет JSON контента — в node-тестах это не резолвится (import.meta.glob — примитив Vite). Поэтому `storage.ts` НЕ импортирует loader: contentVersion передаётся константой через параметр с дефолтом:

```ts
import { createProfile, parseProfile, type Profile } from "@orbitquest/contracts";

const KEY = "orbitquest:profile";
const BACKUP_KEY = "orbitquest:profile:backup";
export const APP_CONTENT_VERSION = "2026.07.08-1"; // синхронизировано с content/index.json; смок-тест сверяет

export function loadProfile(): Profile { /* как описано */ }
export function saveProfile(profile: Profile): void { localStorage.setItem(KEY, JSON.stringify(profile)); }
export function exportProfile(profile: Profile): string { return JSON.stringify(profile, null, 2); }
export function importProfile(json: string) {
  try { return parseProfile(JSON.parse(json), APP_CONTENT_VERSION); }
  catch { return { ok: false as const, error: "Файл не читается как JSON." }; }
}
```

В `scripts/smoke.mjs` добавить сверку: `APP_CONTENT_VERSION` в `storage.ts` === `contentVersion` в `content/index.json` (простым regex/JSON.parse).

- [ ] **Step 4: Зелёный прогон** — `npm test --workspace @orbitquest/web && npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/profile apps/web/src/content apps/web/tsconfig.app.json scripts/smoke.mjs
git commit -m "feat(web): profile storage with import/export and content loader"
```

---

### Task 7: Машина пролога + полноэкранный плеер + Root-роутер стадий

**Files:**
- Create: `apps/web/src/prologue/prologue.ts`, `apps/web/src/prologue/prologue.test.ts`
- Create: `apps/web/src/prologue/Prologue.tsx`
- Create: `apps/web/src/app/Root.tsx`
- Modify: `apps/web/src/main.tsx` (рендерить `Root`)
- Modify: `apps/web/src/styles.css` (стили пролога, добавить в конец)

**Interfaces:**
- Consumes: `prologueScenes`, `prologueArt` из loader; `loadProfile`/`saveProfile`.
- Produces:
  - `prologue.ts`: `advanceScene(profile: Profile, sceneCount: number, name?: string): Profile` — чистая функция: инкремент `prologueSceneIndex`, на сцене с `nameInput` пишет `navigatorName` (пустое имя → "Навигатор"), на последней сцене ставит `prologueDone: true`; `skipPrologue(profile): Profile`.
  - `Root.tsx`: `gameStage(profile): "prologue" | "calibration" | "sector" | "main"` — prologue пока `!prologueDone`; calibration пока `!calibration.done`; sector пока `sector === null`; иначе main. Root держит профиль в `useState`, все мутации через `update(fn: (p: Profile) => Profile)` → `saveProfile` в `useEffect`. Пока стадии calibration/sector не реализованы (задачи 8–9) — Root показывает заглушку «Калибровка готовится» с кнопкой `Продолжить всё равно` только в DEV.
  - `Prologue.tsx` props: `{ scenes, art, sceneIndex, onAdvance(name?: string): void, onSkip(): void }`.

- [ ] **Step 1: Тесты `prologue.test.ts`**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createProfile } from "@orbitquest/contracts";
import { advanceScene, skipPrologue } from "./prologue.ts";

test("advance persists per scene and finishes on last", () => {
  let p = createProfile("v1");
  p = advanceScene(p, 7);
  assert.equal(p.prologueSceneIndex, 1);
  assert.equal(p.prologueDone, false);
  for (let i = 1; i < 7; i += 1) p = advanceScene(p, 7);
  assert.equal(p.prologueDone, true);
});

test("name is captured on name-input scene, empty falls back", () => {
  let p = createProfile("v1");
  p = advanceScene(p, 7); p = advanceScene(p, 7); // теперь index=2 (intro_kora)
  p = advanceScene(p, 7, "  Женя  ");
  assert.equal(p.navigatorName, "Женя");
  const q = advanceScene({ ...createProfile("v1"), prologueSceneIndex: 2 }, 7, "   ");
  assert.equal(q.navigatorName, "Навигатор");
});

test("skip completes prologue without touching name", () => {
  const p = skipPrologue(createProfile("v1"));
  assert.equal(p.prologueDone, true);
});
```

- [ ] **Step 2: FAIL прогон** — `npm test --workspace @orbitquest/web`

- [ ] **Step 3: Реализация**

`prologue.ts`:

```ts
import type { Profile } from "@orbitquest/contracts";

export function advanceScene(profile: Profile, sceneCount: number, name?: string): Profile {
  const next = { ...profile };
  if (typeof name === "string") next.navigatorName = name.trim() || "Навигатор";
  next.prologueSceneIndex = Math.min(profile.prologueSceneIndex + 1, sceneCount);
  if (next.prologueSceneIndex >= sceneCount) next.prologueDone = true;
  return next;
}

export function skipPrologue(profile: Profile): Profile {
  return { ...profile, prologueDone: true, prologueSceneIndex: Number.MAX_SAFE_INTEGER };
}
```

`Prologue.tsx` — полноэкранный слой: фон = `art[scene.art]` (`background-image`, `background-size: cover`), затемняющий градиент снизу, плашка: `speaker` бейджем, `title`, `paragraphs` (по одному `<p>`), опциональный `<input>` при `nameInput` (autoFocus, maxLength 24), крупная кнопка `actionLabel` (min-height 52px), тонкая ссылка «Пропустить пролог» внизу (после подтверждения `window.confirm`). Прогресс-точки сцен сверху. Никаких анимаций, критичных для смысла (`prefers-reduced-motion` уважается тем, что их нет).

`Root.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import type { Profile } from "@orbitquest/contracts";
import { loadProfile, saveProfile } from "../profile/storage";
import { prologueScenes, prologueArt } from "../content/loader";
import { advanceScene, skipPrologue } from "../prologue/prologue";
import { Prologue } from "../prologue/Prologue";
import { App } from "../App";

export function gameStage(p: Profile): "prologue" | "calibration" | "sector" | "main" {
  if (!p.prologueDone) return "prologue";
  if (!p.calibration.done) return "calibration";
  if (p.sector === null) return "sector";
  return "main";
}

export function Root() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  useEffect(() => { saveProfile(profile); }, [profile]);
  const stage = useMemo(() => gameStage(profile), [profile]);

  if (stage === "prologue") {
    return (
      <Prologue
        scenes={prologueScenes} art={prologueArt} sceneIndex={profile.prologueSceneIndex}
        onAdvance={(name) => setProfile((p) => advanceScene(p, prologueScenes.length, name))}
        onSkip={() => setProfile(skipPrologue)}
      />
    );
  }
  if (stage === "calibration" || stage === "sector") {
    return <CalibrationStagePlaceholder />; // заменяется в Task 9
  }
  return <App profile={profile} onProfileChange={setProfile} />;
}
```

`App` пока не принимает props — на этом шаге добавить их прокидывание с игнором (`export function App(_props: { profile?: Profile; onProfileChange?: (p: Profile) => void })`), полноценная интеграция в Task 12. `main.tsx` рендерит `<Root />`.

- [ ] **Step 4: Зелёный прогон + ручная проверка**

Run: `npm test --workspace @orbitquest/web && npm run typecheck && npm run build`
Затем `npm run dev:web`, открыть `http://127.0.0.1:4173`: пролог идёт по сценам, F5 на середине возвращает на ту же сцену, имя сохраняется, после 7-й сцены — заглушка калибровки. Проверить в DevTools mobile viewport 390×844: нет горизонтального скролла.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/prologue apps/web/src/app apps/web/src/main.tsx apps/web/src/App.tsx apps/web/src/styles.css
git commit -m "feat(web): prologue scene machine, fullscreen player, stage router"
```

---

### Task 8: Контент калибровки + детерминированный скоринг

**Files:**
- Create: `content/calibration/items.json`
- Create: `apps/web/src/diagnostic/scoring.ts`
- Create: `apps/web/src/diagnostic/scoring.test.ts`

**Interfaces:**
- Consumes: `CalibrationItem`, `CalibrationAnswer`, `CalibrationResult`, `Capability` из contracts.
- Produces: `scoreCalibration(items: CalibrationItem[], answers: CalibrationAnswer[]): CalibrationResult`. Правила (детерминированные):
  - ответ верный ⇔ `choiceId === item.answer` (значит не "dont-know");
  - capability навыка: верный `predict-output` c `confident` → `applies`; верный `choose-explanation` → `recognizes`; иначе `unknown`; по навыку берётся максимум;
  - skip-list: `item.skipsMissionId` попадает в список ⇔ ответ верный И `confident`;
  - рекомендация сектора: все 6 code-item'ов верные и confident → `"agent"`, иначе `"code"`.

- [ ] **Step 1: `content/calibration/items.json` — полные 8 заданий**

```json
[
  { "id": "q1", "skillId": "code.literal", "type": "choose-explanation", "skipsMissionId": "code-01",
    "prompt": "Что напечатает эта строка Python?", "code": "print(\"2+2\")",
    "options": [
      { "id": "a", "label": "Текст 2+2 — машина печатает ровно то, что в кавычках" },
      { "id": "b", "label": "Число 4 — Python посчитает выражение" },
      { "id": "c", "label": "Ошибку — так писать нельзя" }
    ], "answer": "a" },
  { "id": "q2", "skillId": "code.variables", "type": "predict-output", "skipsMissionId": "code-02",
    "prompt": "Что напечатает программа?", "code": "x = 7\nx = x + 1\nprint(x)",
    "options": [
      { "id": "a", "label": "7" }, { "id": "b", "label": "8" }, { "id": "c", "label": "x + 1" }
    ], "answer": "b" },
  { "id": "q3", "skillId": "code.order", "type": "predict-output", "skipsMissionId": "code-03",
    "prompt": "В каком порядке появятся строки?", "code": "print(\"конец\")\nprint(\"начало\")",
    "options": [
      { "id": "a", "label": "начало, потом конец — по смыслу слов" },
      { "id": "b", "label": "конец, потом начало — сверху вниз" }
    ], "answer": "b" },
  { "id": "q4", "skillId": "code.conditions", "type": "predict-output", "skipsMissionId": "code-04",
    "prompt": "Что напечатает программа?", "code": "if 3 > 5:\n    print(\"да\")\nprint(\"готово\")",
    "options": [
      { "id": "a", "label": "да, потом готово" }, { "id": "b", "label": "только готово" },
      { "id": "c", "label": "ничего" }
    ], "answer": "b" },
  { "id": "q5", "skillId": "code.loops", "type": "predict-output", "skipsMissionId": "code-05",
    "prompt": "Сколько раз напечатается слово?", "code": "for i in range(2):\n    print(\"шаг\")",
    "options": [
      { "id": "a", "label": "1 раз" }, { "id": "b", "label": "2 раза" }, { "id": "c", "label": "3 раза" }
    ], "answer": "b" },
  { "id": "q6", "skillId": "code.read-script", "type": "predict-output", "skipsMissionId": "code-06",
    "prompt": "Что напечатает программа?", "code": "total = 0\nfor n in [5, 20]:\n    if n > 10:\n        total = total + n\nprint(total)",
    "options": [
      { "id": "a", "label": "25" }, { "id": "b", "label": "20" }, { "id": "c", "label": "0" }
    ], "answer": "b" },
  { "id": "q7", "skillId": "agent.verification", "type": "choose-explanation", "skipsMissionId": "agent-02",
    "prompt": "AI-ассистент выдал код и уверенно написал: «Это работает». Что это гарантирует?",
    "options": [
      { "id": "a", "label": "Ничего — уверенность модели не связана с правильностью" },
      { "id": "b", "label": "Код рабочий — модель проверила его перед ответом" },
      { "id": "c", "label": "Код рабочий, если модель современная" }
    ], "answer": "a" },
  { "id": "q8", "skillId": "agent.permissions", "type": "choose-explanation", "skipsMissionId": "agent-03",
    "prompt": "AI-агенту нужен доступ к твоим файлам, чтобы ответить на вопрос о них. Какой доступ безопаснее выдать?",
    "options": [
      { "id": "a", "label": "Только чтение — прочитать может, изменить или удалить нет" },
      { "id": "b", "label": "Полный — иначе агент не разберётся" },
      { "id": "c", "label": "Никакой разницы — доступ есть доступ" }
    ], "answer": "a" }
]
```

- [ ] **Step 2: Тесты `scoring.test.ts` — три fixture-профиля (приёмка спеки)**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import type { CalibrationAnswer, CalibrationItem } from "@orbitquest/contracts";
import { scoreCalibration } from "./scoring.ts";

const items = JSON.parse(
  await readFile(new URL("../../../../content/calibration/items.json", import.meta.url), "utf8"),
) as CalibrationItem[];

const answer = (itemId: string, choiceId: string, confident: boolean): CalibrationAnswer =>
  ({ itemId, choiceId, confident });

test("fixture novice: all dont-know -> code sector, no skips, all unknown", () => {
  const result = scoreCalibration(items, items.map((i) => answer(i.id, "dont-know", false)));
  assert.equal(result.recommendedSector, "code");
  assert.deepEqual(result.skipMissionIds, []);
  assert.ok(Object.values(result.capabilities).every((c) => c === "unknown"));
});

test("fixture mixed: q1-q3 confident-correct -> skips code-01..03, code sector", () => {
  const result = scoreCalibration(items, items.map((i) =>
    ["q1", "q2", "q3"].includes(i.id) ? answer(i.id, i.answer, true) : answer(i.id, "dont-know", false)));
  assert.deepEqual(result.skipMissionIds, ["code-01", "code-02", "code-03"]);
  assert.equal(result.recommendedSector, "code");
  assert.equal(result.capabilities["code.variables"], "applies");
  assert.equal(result.capabilities["code.literal"], "recognizes");
});

test("fixture strong-code: q1-q6 confident-correct -> agent sector recommended", () => {
  const result = scoreCalibration(items, items.map((i) =>
    ["q1","q2","q3","q4","q5","q6"].includes(i.id) ? answer(i.id, i.answer, true) : answer(i.id, "dont-know", false)));
  assert.equal(result.recommendedSector, "agent");
});

test("unconfident correct answer builds capability but not skip", () => {
  const result = scoreCalibration(items, [answer("q2", "b", false)]);
  assert.deepEqual(result.skipMissionIds, []);
  assert.equal(result.capabilities["code.variables"], "unknown"); // applies требует confident
});
```

- [ ] **Step 3: FAIL прогон**, затем реализация `scoring.ts`:

```ts
import type { CalibrationAnswer, CalibrationItem, CalibrationResult, Capability } from "@orbitquest/contracts";

const rank: Record<Capability, number> = { unknown: 0, recognizes: 1, applies: 2, transfers: 3 };

export function scoreCalibration(items: CalibrationItem[], answers: CalibrationAnswer[]): CalibrationResult {
  const byItem = new Map(answers.map((a) => [a.itemId, a]));
  const capabilities: Record<string, Capability> = {};
  const skipMissionIds: string[] = [];
  let codeConfidentCorrect = 0;

  for (const item of items) {
    const a = byItem.get(item.id);
    const correct = !!a && a.choiceId === item.answer;
    let cap: Capability = "unknown";
    if (correct && item.type === "predict-output" && a.confident) cap = "applies";
    else if (correct && item.type === "choose-explanation") cap = "recognizes";
    if (rank[cap] > rank[capabilities[item.skillId] ?? "unknown"]) capabilities[item.skillId] = cap;
    else capabilities[item.skillId] ??= "unknown";
    if (correct && a.confident && item.skipsMissionId) skipMissionIds.push(item.skipsMissionId);
    if (correct && a.confident && item.skillId.startsWith("code.")) codeConfidentCorrect += 1;
  }
  return {
    capabilities,
    recommendedSector: codeConfidentCorrect >= 6 ? "agent" : "code",
    skipMissionIds,
  };
}
```

- [ ] **Step 4: Зелёный прогон** — `npm test --workspace @orbitquest/web && npm run validate:content && npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add content/calibration/items.json apps/web/src/diagnostic/scoring.ts apps/web/src/diagnostic/scoring.test.ts
git commit -m "feat: calibration content and deterministic scoring with fixture profiles"
```

---

### Task 9: UI калибровки + раскрытие результата + выбор сектора

**Files:**
- Create: `apps/web/src/diagnostic/Calibration.tsx`
- Modify: `apps/web/src/app/Root.tsx` (заменить заглушку)
- Modify: `apps/web/src/styles.css`

**Interfaces:**
- Consumes: `calibrationItems` из loader; `scoreCalibration`; профиль через props `{ profile, onProfileChange }`.
- Produces: стадия `calibration` — по одному заданию на экран: prompt, код (моноширинный блок с внутренним `overflow-x: auto`), варианты (кнопки ≥44px), отдельная честная кнопка «Не знаю»; после выбора — переключатель «Уверен(а) в ответе» (checkbox, по умолчанию выключен) и кнопка «Дальше». Работает полностью офлайн, без LLM. Стадия `sector`: экран результата — от KORA (формула: наблюдение → вопрос → шаг): карта навыков списком (`skillId` → человекочитаемое имя + capability по-русски), рекомендация сектора с объяснением «почему» (сколько уверенных верных), список миссий к пропуску с переключателем «Пройти всё подряд» (`skipsOverridden`), выбор сектора двумя крупными карточками («Основы кода» / «AI-кодинг»), можно выбрать не рекомендованный.

- [ ] **Step 1: Реализовать `Calibration.tsx`**

Состояние: `const [idx, setIdx] = useState(profile.calibration.answers.length)` (перезагрузка продолжает с недоотвеченного), `const [picked, setPicked] = useState<string | null>(null)`, `const [confident, setConfident] = useState(false)`. «Дальше»: пишет `CalibrationAnswer` в профиль (`onProfileChange`), сбрасывает локальный стейт; на последнем — считает `scoreCalibration`, пишет `calibration.result` и `calibration.done = true`. Человекочитаемые имена навыков — словарь в этом же файле:

```ts
const skillNames: Record<string, string> = {
  "code.literal": "Буквальность машины",
  "code.variables": "Переменные и данные",
  "code.order": "Порядок выполнения",
  "code.conditions": "Условия",
  "code.loops": "Циклы",
  "code.read-script": "Чтение скрипта целиком",
  "agent.model-context": "Модель, инструкции, контекст",
  "agent.verification": "Проверка AI-кода",
  "agent.permissions": "Инструменты и разрешения",
};
const capNames: Record<string, string> = {
  unknown: "не проверено", recognizes: "узнаёт", applies: "применяет", transfers: "переносит",
};
```

Экран результата (стадия `sector`, отдельный компонент `SectorReveal` в том же файле) — выбор сектора пишет `profile.sector`; текст рекомендации из `Placement-and-Routes` («Базовые системы требуют активации…» для code-рекомендации). Кнопка «Повторить калибровку» сбрасывает `calibration` в исходное состояние (answers=[], result=null, done=false).

- [ ] **Step 2: Обновить Root** — убрать `CalibrationStagePlaceholder`, отрендерить `Calibration` для стадий `calibration`/`sector` (компонент сам решает по `profile.calibration.done`, что показывать).

- [ ] **Step 3: Проверка**

Run: `npm run typecheck && npm test --workspace @orbitquest/web && npm run build`
Ручная: dev-сервер, пройти пролог → калибровку с «не знаю» на всё → рекомендация «Основы кода», нет skip'ов; F5 в середине калибровки продолжает с того же вопроса; выбрать сектор → пока попадаем в старый App-прототип (норм до Task 12). Viewport 390×844 — без горизонтального скролла.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/diagnostic/Calibration.tsx apps/web/src/app/Root.tsx apps/web/src/styles.css
git commit -m "feat(web): calibration UI, result reveal, sector choice with override"
```

---

### Task 10: Движок миссии (чистый автомат) + capability + планировщик

**Files:**
- Create: `apps/web/src/missions/engine.ts`
- Create: `apps/web/src/missions/engine.test.ts`

**Interfaces:**
- Consumes: `Mission`, `MissionTask`, `AttemptRecord`, `Profile`, `Capability` из contracts.
- Produces:
  - `checkAnswer(task: MissionTask, key: string): boolean` — для choice-типов `key === task.answer`; для `find-error-line` `key === task.answer`; для `order-steps` `key === "0,1,…,n-1"` (identity-перестановка);
  - `type EngineState = { phase: "briefing" | "task" | "result"; taskIndex: number; attemptsLeft: number; hintStage: 0|1|2|3; taskStatus: "answering" | "wrong" | "resolved"; resolvedCorrect: boolean; attempts: AttemptRecord[] }`;
  - `initialEngineState(): EngineState` (phase briefing, attemptsLeft 3);
  - `engineReducer(state, event, mission: Mission, now: () => string): EngineState`, события: `{type:"begin"}`, `{type:"answer"; key: string}`, `{type:"retry"}`, `{type:"hint"}` (поднимает hintStage вручную максимум до 3 — только после ≥1 попытки), `{type:"next"}`;
  - автомат цикла ошибки: `answer` верный → `resolved` (+attempt log); неверный → attempt log, `attemptsLeft-1`, `hintStage+1` (макс 3), статус `wrong`; при `attemptsLeft === 0` → `resolved` с `resolvedCorrect: false` (UI показывает `explain`); `retry` из `wrong` → `answering`; `next` из `resolved` → следующее задание (attemptsLeft=3, hintStage=0) или `result`;
  - `applyMissionResult(profile: Profile, mission: Mission, attempts: AttemptRecord[], today: Date): Profile` — пишет `MissionRecord` (status completed, completedAt, `nextReviewAt = +7 дней`), не трогая чужие записи;
  - `deriveCapabilities(profile: Profile, missionsById: Record<string, Mission>): Record<string, Capability>` — max по evidence: верная попытка с `hintStage === 0` на задании типа `choose-explanation` → `recognizes`; на `predict-output|find-error-line|spot-diff|order-steps` → `applies` при `contextTag === "familiar"`, `transfers` при `"new"`; учитывает и стартовые capability из `calibration.result`;
  - `recommendMission(profile: Profile, order: string[], missionsById, today: Date): string | null` — первая незавершённая и не-скипнутая (если `!skipsOverridden`) миссия сектора; если все завершены — миссия с самым ранним `nextReviewAt <= today`, иначе `null`;
  - `missionAvailability(profile, missionId): "new" | "skipped" | "completed" | "review"`.

- [ ] **Step 1: Тесты `engine.test.ts`** (минимум — эти сценарии):

```ts
// фикстура missionFixture: 2 задания (choose-explanation t1 answer "a"; predict-output t2 answer "b", proof)
test("happy path: correct answers walk briefing→tasks→result");
test("wrong answer opens next hint level and burns attempt", () => {
  // answer wrong → taskStatus wrong, attemptsLeft 2, hintStage 1, attempts[0].correct === false
});
test("three wrong answers resolve task with explain and mission continues (no dead end)", () => {
  // wrong ×3 → resolved, resolvedCorrect false; next → task 2 (не result, не застревает)
});
test("checkAnswer handles order-steps identity permutation");
test("deriveCapabilities: clean predict answer in familiar context -> applies; with hints -> stays from calibration");
test("recommendMission skips calibration-skipped missions unless overridden");
test("recommendMission returns review mission when all completed and nextReviewAt due");
test("applyMissionResult preserves unknown mission records");
```

Каждый тест — полноценный с assert'ами по интерфейсам выше (fixture-миссия описана в файле теста локальным объектом, без импорта контента).

- [ ] **Step 2: FAIL прогон** — `npm test --workspace @orbitquest/web`

- [ ] **Step 3: Реализовать `engine.ts` строго по интерфейсам** (чистые функции, без React и localStorage; `now: () => string` по умолчанию `() => new Date().toISOString()`).

Ключевой кусок редьюсера:

```ts
case "answer": {
  if (state.phase !== "task" || state.taskStatus !== "answering") return state;
  const task = mission.tasks[state.taskIndex];
  const correct = checkAnswer(task, event.key);
  const attempt: AttemptRecord = {
    taskId: task.id, answerKey: event.key, correct,
    hintStage: state.hintStage, at: now(),
  };
  const attempts = [...state.attempts, attempt];
  if (correct) return { ...state, attempts, taskStatus: "resolved", resolvedCorrect: true };
  const attemptsLeft = state.attemptsLeft - 1;
  const hintStage = Math.min(3, state.hintStage + 1) as EngineState["hintStage"];
  if (attemptsLeft <= 0) return { ...state, attempts, attemptsLeft: 0, hintStage, taskStatus: "resolved", resolvedCorrect: false };
  return { ...state, attempts, attemptsLeft, hintStage, taskStatus: "wrong" };
}
```

- [ ] **Step 4: Зелёный прогон** — `npm test --workspace @orbitquest/web && npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/missions/engine.ts apps/web/src/missions/engine.test.ts
git commit -m "feat(web): mission engine with error-cycle automaton, capability evidence, scheduler"
```

---

### Task 11: Контент главы «Основы кода» (CODE-01…CODE-06)

**Files:**
- Create: `content/missions/code-01.json` … `content/missions/code-06.json`

**Interfaces:**
- Consumes: схема `Mission` из contracts (Task 2), `missionOrder` уже зафиксирован в `content/index.json`.
- Produces: 6 валидных миссий; `skillId` и данные заданий — строго из таблицы ниже. Реплики брифинга — голосом KORA (наблюдение → вопрос → шаг), `redTest` — голосом PIX (факт без осуждения), `why` начинается со слова «Зачем». Последнее задание каждой миссии — `"proof": true`.

- [ ] **Step 1: Написать 6 файлов. Обязательные данные (id/тип/код/ответы) — из этой таблицы, текст реплик — по канону персонажей:**

**code-01 «Буквальность машины»** (skill `code.literal`, satellite CODE-01):
- t1 `choose-explanation`: «Что такое программа?» — a) точная последовательность инструкций, машина выполняет её буквально ✓; b) список пожеланий, машина догадается сама; c) описание результата, путь машина выбирает сама. answer `a`.
- t2 `predict-output`, code `print("Привет")\nprint("Привет")` — a) Привет один раз; b) Привет два раза ✓; c) ошибка. answer `b`.
- t3 `find-error-line` (proof), code `print("Запуск")\nprin("Готово")` — answer `"2"` (опечатка `prin`; машина не догадывается, что имелось в виду).

**code-02 «Переменные и данные»** (skill `code.variables`, satellite CODE-02):
- t1 `choose-explanation`: «Что такое переменная?» — a) коробка с именем, внутри значение; его можно заменить ✓; b) магическое слово; c) результат программы. answer `a`.
- t2 `predict-output`, code `x = 3\nx = x + 2\nprint(x)` — a) 3; b) 5 ✓; c) x + 2. answer `b`.
- t3 `spot-diff` (proof), code `name = "Ада"\nprint("Привет,", name)`, codeB `name = "Ада"\nprint("Привет, name")` — что изменилось: a) ничего, выведут одно и то же; b) во второй версии напечатается слово name буквально — кавычки превращают его в текст ✓; c) вторая версия сломается. answer `b`.

**code-03 «Порядок выполнения»** (skill `code.order`, satellite CODE-03):
- t1 `order-steps`: «Расставь строки, чтобы программа посчитала и напечатала сумму» — lines (правильный порядок): `["a = 2", "b = 3", "total = a + b", "print(total)"]`, initialOrder `[3, 1, 0, 2]`, answer `""`.
- t2 `predict-output`, code `print("один")\nprint("три")\nprint("два")` — a) один, два, три (по смыслу); b) один, три, два (сверху вниз) ✓. answer `b`.
- t3 `find-error-line` (proof), code `total = price * 2\nprice = 10\nprint(total)` — answer `"1"` (переменная используется до того, как ей дали значение).

**code-04 «Условия»** (skill `code.conditions`, satellite CODE-04):
- t1 `choose-explanation`: «Что делает if?» — a) развилка: блок под ним выполняется только когда условие истинно ✓; b) повторяет блок несколько раз; c) всегда выполняет оба варианта. answer `a`.
- t2 `predict-output`, code `age = 15\nif age >= 18:\n    print("доступ открыт")\nelse:\n    print("доступа нет")` — a) доступ открыт; b) доступа нет ✓; c) обе строки. answer `b`.
- t3 `predict-output` (proof), code `t = 3\nif t > 5:\n    print("жарко")\nprint("готово")` — a) жарко, готово; b) только готово ✓ (отступ показывает, что внутри if); c) ничего. answer `b`.

**code-05 «Циклы»** (skill `code.loops`, satellite CODE-05):
- t1 `choose-explanation`: «Зачем нужен цикл?» — a) повторить блок несколько раз, не копируя строки ✓; b) ускорить компьютер; c) сделать код красивее. answer `a`.
- t2 `predict-output`, code `for i in range(3):\n    print(i)` — a) 1 2 3; b) 0 1 2 ✓; c) 0 1 2 3. answer `b`.
- t3 `predict-output` (proof), code `count = 0\nwhile count < 3:\n    print("шаг")` — a) шаг три раза; b) шаг печатается бесконечно — count никогда не меняется ✓; c) ничего. answer `b`.

**code-06 «Прочитать скрипт целиком»** (skill `code.read-script`, satellite CODE-06, durationMinutes 15, 4 задания):
- общий code для t1/t2: `prices = [120, 80, 200]\ntotal = 0\nfor p in prices:\n    if p > 100:\n        total = total + p\nprint(total)`
- t1 `choose-explanation`: «Что делает скрипт?» — a) складывает все цены; b) складывает только цены больше 100 ✓; c) находит самую большую цену. answer `b`.
- t2 `predict-output` — a) 400; b) 320 ✓; c) 200. answer `b`.
- t3 `spot-diff`: codeB тот же, но `if p >= 80:` — a) результат не изменится; b) теперь пройдут все три цены, напечатает 400 ✓; c) программа сломается. answer `b`.
- t4 `find-error-line` (proof), code `prices = [120, 80, 200]\ntotal = 0\nfor p in prices:\n    if p > 100:\n        total = total + 1\nprint(total)`, prompt «Скрипт должен печатать сумму дорогих цен, а печатает 2. В какой строке ошибка?» — answer `"5"` (прибавляется 1 вместо p).

Каждая миссия: `durationMinutes` 10–15, `contextTag: "familiar"`, `koraFallback` — 2–3 предложения предметной помощи по теме миссии без выдачи ответов, `hints` — три уровня строго (вопрос → направление → разбор), `explain` — короткий разбор с правильным ответом.

- [ ] **Step 2: Валидация**

Run: `npm run validate:content`
Expected: 6 code-миссий валидны; предупреждения только по agent-миссиям.

- [ ] **Step 3: Commit**

```bash
git add content/missions/code-01.json content/missions/code-02.json content/missions/code-03.json content/missions/code-04.json content/missions/code-05.json content/missions/code-06.json
git commit -m "content: chapter 1 'Основы кода' — six missions CODE-01..06"
```

---

### Task 12: Контент главы «AI-кодинг» (AGENT-01…AGENT-03)

**Files:**
- Create: `content/missions/agent-01.json`, `agent-02.json`, `agent-03.json`

**Interfaces:** как Task 11.

- [ ] **Step 1: Написать 3 файла по данным:**

**agent-01 «Модель, инструкции, контекст»** (skill `agent.model-context`, satellite AGENT-01):
- t1 `choose-explanation`: «Как LLM выдаёт ответ?» — a) понимает задачу как человек и рассуждает; b) продолжает текст: предсказывает следующие слова по инструкции и контексту ✓; c) ищет готовый ответ в интернете. answer `b`.
- t2 `order-steps`: «Расставь по порядку, что происходит, когда ты просишь AI написать код» — lines: `["Ты пишешь запрос и прикладываешь файлы", "Запрос и файлы попадают в контекст модели", "Модель продолжает контекст — генерирует ответ", "Ответ возвращается и сам становится частью контекста"]`, initialOrder `[2, 0, 3, 1]`, answer `""`.
- t3 `choose-explanation` (proof): «Два запроса: «напиши функцию скидки» и «напиши функцию скидки, вот наш файл с правилами скидок». Какой ответ вероятнее подойдёт проекту и почему?» — a) первый — модель не отвлекается; b) второй — в контексте есть реальные правила, модели не нужно их выдумывать ✓; c) одинаково. answer `b`.

**agent-02 «Почему AI уверенно врёт»** (skill `agent.verification`, satellite AGENT-02):
- t1 `choose-explanation`: «Что такое галлюцинация модели?» — a) правдоподобная выдумка: модель продолжает текст, даже когда фактов не хватает ✓; b) редкий сбой сервера; c) шутка разработчиков. answer `a`.
- t2 `find-error-line`, code (ответ AI-ассистента): `import os\ndata = os.read_json("config.json")\nprint(data)`, prompt «AI уверенно выдал этот код. В какой строке сомнительное место, которое стоит проверить по документации?» — answer `"2"` (в модуле os нет read_json — выглядит правдоподобно, но выдумано).
- t3 `choose-explanation` (proof): «Как проверить код от AI, не доверяя уверенному тону?» — a) спросить модель «ты уверена?»; b) прочитать код, сверить незнакомые функции с документацией, прогнать тест ✓; c) если код красиво отформатирован — он рабочий. answer `b`.

**agent-03 «Инструменты и границы разрешений»** (skill `agent.permissions`, satellite AGENT-03):
- t1 `choose-explanation`: «Чем агент отличается от чата?» — a) агент умнее; b) у агента есть инструменты — он не только пишет текст, но и выполняет реальные действия: читает файлы, запускает команды ✓; c) ничем. answer `b`.
- t2 `choose-explanation`: «Какое разрешение агенту опаснее всего выдавать без подтверждения каждого шага?» — a) читать файлы проекта; b) удалять и перезаписывать файлы ✓; c) искать в документации. answer `b`.
- t3 `find-error-line` (proof), code (конфиг агента): `permissions:\n  allow_read: project/**\n  allow_run_tests: true\n  allow_delete: **` , prompt «Найди строку, которую нельзя оставлять в таком виде» — answer `"4"` (удаление чего угодно без границ).

- [ ] **Step 2: Строгая валидация теперь обязана быть зелёной**

Run: `node --experimental-strip-types scripts/validate-content.mjs --strict`
Expected: `content valid` без предупреждений. С этого момента в CI используется `--strict`.

- [ ] **Step 3: Commit**

```bash
git add content/missions/agent-01.json content/missions/agent-02.json content/missions/agent-03.json
git commit -m "content: chapter 1 'AI-кодинг' — missions AGENT-01..03"
```

---

### Task 13: Плеер миссии + 5 рендереров заданий + перестройка оболочки (Мостик/Atlas/Профиль)

**Files:**
- Create: `apps/web/src/missions/MissionPlayer.tsx`
- Create: `apps/web/src/atlas/AtlasMap.tsx`
- Modify: `apps/web/src/App.tsx` (капитальная перестройка)
- Modify: `apps/web/src/styles.css`
- Delete-inline: демо-вью Radar/Hangar и фиктивная миссия из App.tsx (домен `apps/web/src/domain/mission.ts` и его тест удаляются: `git rm apps/web/src/domain/mission.ts apps/web/src/domain/mission.test.ts`)

**Interfaces:**
- Consumes: `engineReducer`/`initialEngineState`/`checkAnswer`/`applyMissionResult`/`deriveCapabilities`/`recommendMission`/`missionAvailability` из engine; `missionsById`, `contentIndex` из loader; профиль через props.
- Produces:
  - `App` props: `{ profile: Profile; onProfileChange: (updater: (p: Profile) => Profile) => void }` (Root переводится на updater-форму, чтобы избежать гонок);
  - палубы v1: **Мостик** (рекомендованная миссия дня + список миссий сектора со статусами new/skipped/completed/review + переключатель сектора), **Atlas** (`AtlasMap`), **Профиль** (имя, экспорт кнопкой-скачиванием, импорт `<input type="file">` c `window.confirm` «Заменить текущий прогресс?», повтор калибровки, повтор пролога);
  - `MissionPlayer` props: `{ mission: Mission; onExit(): void; onComplete(attempts: AttemptRecord[]): void }` — рендерит фазы briefing (why + реплики KORA + «Начать»), task (рендерер по типу), result (итог: сколько заданий чисто, изменения capability, «На Мостик»);
  - рендереры заданий (внутри MissionPlayer.tsx, каждый — маленький компонент): `ChoiceTask` (choose-explanation/predict-output/spot-diff: код(ы) в `<pre>` с горизонтальным скроллом, варианты-кнопки), `OrderTask` (список строк, у каждой кнопки «▲»/«▼» ≥44px, кнопка «Проверить порядок» отправляет `key = currentOrder.join(",")`), `FindLineTask` (строки кода — кнопки во всю ширину, tap = ответ номером строки);
  - при `taskStatus === "wrong"`: плашка PIX `redTest` + раскрытая подсказка KORA уровня `hintStage` + кнопка «Попробовать ещё раз» (`retry`); при `resolved`: `explain` + «Дальше»;
  - экспорт файла: `const blob = new Blob([exportProfile(profile)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "orbitquest-profile.json"; a.click(); URL.revokeObjectURL(a.href);`
  - `AtlasMap` props: `{ profile, missionsById, sector }` — SVG: спутники = миссии сектора, позиция по кругу, цвет по capability навыка (unknown серый, recognizes cyan, applies green, transfers violet), выбранный спутник показывает название навыка + статус + кнопку «Начать миссию» если доступна.

- [ ] **Step 1: Реализовать MissionPlayer + рендереры.** Локальный стейт: `const [state, dispatch] = useReducer((s: EngineState, e: EngineEvent) => engineReducer(s, e, mission, () => new Date().toISOString()), undefined, initialEngineState);` По входу в `result`-фазу один раз вызвать `onComplete(state.attempts)` (через useEffect с guard-ref).

- [ ] **Step 2: Перестроить App.tsx.** Сохранить существующие классы стилей оболочки (`app-shell`, `topbar`, `rail`, `mobile-dock`, `deck-view`) — визуальный каркас не переделываем, меняем состав палуб и контент. `handleStartMission(missionId)` открывает MissionPlayer поверх (`useState<string | null>`), `onComplete` → `onProfileChange((p) => applyMissionResult(p, mission, attempts, new Date()))`. Ship-status полоса заменяется реальным прогрессом: `завершено X из Y миссий сектора`. Заголовок Мостика — рекомендация дня: «Рекомендованная миссия» + причина (новая / повторение по интервалу). Удалить `loadBootstrap`-зависимую логику из App (bootstrap остаётся только как dev-заглушка данных корабля: имя корабля и registry — константами).

- [ ] **Step 3: Проверки**

Run: `npm run typecheck && npm test --workspace @orbitquest/web && npm run build && npm run smoke`
Ручная (dev): полный путь новичка — пролог → калибровка (всё «не знаю») → сектор «Основы кода» → CODE-01 до конца (включая ветку ошибки: ответить неверно, увидеть redTest PIX + подсказку 1, retry, исчерпать попытки на одном задании — миссия всё равно доходит до result) → Мостик показывает CODE-02 как рекомендацию → Atlas показывает CODE-01 зелёным/голубым. Экспорт скачивает файл; импорт этого файла после «Стереть» (очистить localStorage вручную в DevTools) восстанавливает прогресс. Viewport 390×844 и 360×800: без горизонтального скролла страницы, код скроллится внутри блока.

- [ ] **Step 4: Commit**

```bash
git rm apps/web/src/domain/mission.ts apps/web/src/domain/mission.test.ts
git add apps/web/src/missions/MissionPlayer.tsx apps/web/src/atlas/AtlasMap.tsx apps/web/src/App.tsx apps/web/src/app/Root.tsx apps/web/src/styles.css
git commit -m "feat(web): mission player with five task renderers, real bridge/atlas/profile decks"
```

---

### Task 14: Клиент KORA + кнопка с UI-gate + фолбэк «Бортовая справка»

**Files:**
- Create: `apps/web/src/kora/askKora.ts`
- Create: `apps/web/src/kora/askKora.test.ts`
- Modify: `apps/web/src/missions/MissionPlayer.tsx` (кнопка в брифинге и после ошибки)
- Modify: `apps/web/vite.config.ts` / `.env`-механика не нужна: URL воркера — `import.meta.env.VITE_KORA_URL`, клиентский секрет — `import.meta.env.VITE_KORA_CLIENT_KEY` (оба опциональны; без них KORA сразу офлайн)

**Interfaces:**
- Consumes: `Mission`, `MissionTask`.
- Produces:
  - `askKora(params: { missionId: string; taskId: string | null; hintStage: 0|1|2|3; question: string }, config?: { url?: string; clientKey?: string; timeoutMs?: number; fetchFn?: typeof fetch }): Promise<{ live: true; text: string } | { live: false; reason: "no-config" | "network" | "http" | "timeout" }>`;
  - UI: в брифинге поле вопроса + кнопка «Спросить KORA» всегда активна; в задании — активна только когда `state.attempts.some(a => a.taskId === currentTask.id)` (первая содержательная попытка сделана); при `live: false` показывается `mission.koraFallback` (или текущая подсказка, если вопрос задан из состояния ошибки) с бейджем **«Бортовая справка · KORA офлайн»** — без ошибок в консоли/UI.

- [ ] **Step 1: Тесты `askKora.test.ts`** — с подставным `fetchFn`:

```ts
test("returns no-config fallback when url or key missing");
test("returns live text on 200 {answer}");
test("returns http fallback on 429/500");
test("returns timeout fallback when fetch hangs past timeoutMs", ...); // fetchFn, который никогда не резолвится + AbortSignal
test("sends x-oq-key header and does NOT send correct answers anywhere in body");
```

- [ ] **Step 2: FAIL → реализация `askKora.ts`:**

```ts
export async function askKora(params, config = {}) {
  const url = config.url ?? import.meta.env.VITE_KORA_URL;
  const clientKey = config.clientKey ?? import.meta.env.VITE_KORA_CLIENT_KEY;
  const fetchFn = config.fetchFn ?? fetch;
  if (!url || !clientKey) return { live: false as const, reason: "no-config" as const };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 12_000);
  try {
    const response = await fetchFn(`${url.replace(/\/$/, "")}/ask`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-oq-key": clientKey },
      body: JSON.stringify(params), // только missionId, taskId, hintStage, question
      signal: controller.signal,
    });
    if (!response.ok) return { live: false as const, reason: "http" as const };
    const body = await response.json();
    if (typeof body?.answer !== "string" || !body.answer) return { live: false as const, reason: "http" as const };
    return { live: true as const, text: body.answer };
  } catch (error) {
    return { live: false as const, reason: error instanceof DOMException && error.name === "AbortError" ? "timeout" as const : "network" as const };
  } finally { clearTimeout(timer); }
}
```

(`import.meta.env` в node-тестах недоступен — обёртка: читать из `config` первым, а обращение к `import.meta.env` завернуть в try/catch или `typeof import.meta.env !== "undefined"` guard. В тестах всегда передаётся config.)

- [ ] **Step 3: Вшить в MissionPlayer** — состояние `koraReply: { text: string; live: boolean } | null`, спиннер «KORA думает…» на время запроса, followed by ответ с бейджем `KORA` (live) или `Бортовая справка · KORA офлайн` (fallback).

- [ ] **Step 4: Прогон** — `npm test --workspace @orbitquest/web && npm run typecheck && npm run build`. Ручная: без настроенного VITE_KORA_URL кнопка честно отвечает «Бортовой справкой», UI без ошибок.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/kora apps/web/src/missions/MissionPlayer.tsx
git commit -m "feat(web): ask-KORA client with honest offline fallback and attempt gate"
```

---

### Task 15: kora-worker (Cloudflare) + hint-safe контекст + тесты

**Files:**
- Create: `apps/kora-worker/package.json`
- Create: `apps/kora-worker/src/guard.ts`, `src/guard.test.ts`
- Create: `apps/kora-worker/src/prompt.ts`, `src/prompt.test.ts`
- Create: `apps/kora-worker/src/index.ts`
- Create: `apps/kora-worker/scripts/build-context.mjs`
- Create: `apps/kora-worker/wrangler.toml`
- Create: `apps/kora-worker/README.md` (деплой-инструкция для владельца)

**Interfaces:**
- Consumes: `content/missions/*.json`, `content/index.json`.
- Produces:
  - `build-context.mjs`: генерирует `apps/kora-worker/src/kora-context.json` — `{ [missionId]: { title, why, briefing, tasks: { [taskId]: { prompt, code?, codeB? } } } }` — **БЕЗ** `answer`, `options`, `hints`, `explain`. Запускается перед деплоем; файл в `.gitignore` не нужен — коммитится (данных-секретов нет), пересборка при изменении контента;
  - `guard.ts` (чистые функции, тестируются node:test): `checkRequest({ method, origin, clientKey, bodyBytes }, env): { ok: true } | { ok: false; status: number; error: string }` (405 не-POST; 403 origin вне `env.ALLOWED_ORIGINS` (csv) — если Origin-заголовок есть; 401 неверный `x-oq-key`; 413 тело > 4KB); `validatePayload(body): { ok: true; payload } | { ok: false }` (missionId/hintStage обязательны, question ≤ 600 символов, hintStage 0..3); `budgetKeys(now: Date, ip: string): { daily: string; perIp: string }` (`budget:YYYY-MM-DD`, `ip:YYYY-MM-DD:<ip>`);
  - `prompt.ts`: `buildMessages(context, payload): { role, content }[]` — системный промпт KORA: канон (наблюдение → вопрос → шаг; НЕ выдаёт готовое решение до `hintStage 3`; не судит игрока; ≤120 слов; русский), предметный контекст из kora-context по missionId/taskId, уровень допустимой помощи по hintStage;
  - `index.ts`: `export default { fetch }` — guard → KV-лимиты (daily ≤ `env.DAILY_BUDGET` (default 200), per-IP ≤ 40, circuit-breaker `errors:streak` ≥ 5 → 503 c TTL 10 мин) → вызов NIM (`env.NIM_API_KEY`, `env.NIM_MODEL`, OpenAI-совместимый `/v1/chat/completions`, `max_tokens: 400`, timeout 10s) → при ошибке Groq (`env.GROQ_API_KEY`, `env.GROQ_MODEL`) → `{ answer, source }` c CORS-заголовками ответа; любая финальная ошибка → 502 `{ error }` (клиент уходит в фолбэк).

- [ ] **Step 1: Тесты guard/prompt** (не требуют Cloudflare): все ветки `checkRequest`, `validatePayload` (в т.ч. отказ на лишние поля с ключами ответов — поле `answer` в payload → `{ok: false}`), `budgetKeys` формат, `buildMessages` не содержит подстрок из `options/answer` fixture-миссии и упоминает hintStage-ограничение.

- [ ] **Step 2: FAIL → реализация.** `package.json`: `{ "name": "@orbitquest/kora-worker", "private": true, "type": "module", "scripts": { "test": "node --test --experimental-strip-types src/**/*.test.ts", "build:context": "node scripts/build-context.mjs" } }` — без wrangler в deps (деплой через `npx wrangler`).

`wrangler.toml`:

```toml
name = "orbitquest-kora"
main = "src/index.ts"
compatibility_date = "2026-06-01"
[[kv_namespaces]]
binding = "LIMITS"
id = "REPLACE_AFTER_wrangler_kv_namespace_create_LIMITS"
[vars]
ALLOWED_ORIGINS = "https://REPLACE_GH_USER.github.io"
DAILY_BUDGET = "200"
NIM_MODEL = "qwen/qwen3.5-397b-instruct"
GROQ_MODEL = "llama-3.3-70b-versatile"
# секреты: npx wrangler secret put NIM_API_KEY / GROQ_API_KEY / CLIENT_KEY
```

`README.md` — пошаговый деплой для владельца: `npx wrangler login` → `npx wrangler kv namespace create LIMITS` (id в toml) → 3 секрета → `npm run build:context --workspace @orbitquest/kora-worker` → `npx wrangler deploy` → прописать `VITE_KORA_URL`/`VITE_KORA_CLIENT_KEY` в GitHub Actions variables. Плюс curl-проверки приёмки: без `x-oq-key` → 401; с ключом → живой ответ.

- [ ] **Step 3: Прогон** — `npm test --workspace @orbitquest/kora-worker && npm run build:context --workspace @orbitquest/kora-worker && git status` (context-файл сгенерирован). Прогнать `node --experimental-strip-types` тесты корня: `npm test`.

- [ ] **Step 4: Commit**

```bash
git add apps/kora-worker
git commit -m "feat(kora-worker): guarded /ask endpoint with NIM->Groq cascade and hint-safe context"
```

*Деплой воркера — ручной шаг владельца (нужен Cloudflare-логин). Игра полностью играбельна без него (фолбэк).*

---

### Task 16: ADR-004 + CI (GitHub Actions → Pages) + публикация + финальная приёмка

**Files:**
- Create: `decisions/ADR-004-Runtime-LLM-NIM-Groq.md`
- Create: `.github/workflows/deploy.yml`
- Modify: `scripts/smoke.mjs` (если нужны финальные инварианты)
- Внешнее: создание публичного GitHub-репозитория + push + включение Pages

**Interfaces:**
- Consumes: всё выше.
- Produces: сайт на `https://<user>.github.io/orbitquest/`, зелёный CI.

- [ ] **Step 1: ADR-004** — по формату ADR-001..003: контекст (Gemini недоступен владельцу: гео-блок + suspended key; ADR-002 неисполним), решение (runtime-LLM только через kora-worker с каскадом NIM → Groq; в клиенте LLM нет вообще; скоринг/маршрут LLM не трогает — только переформулировка объяснений и живые ответы KORA), последствия (фолбэк обязателен по дизайну; смена провайдера = правка vars воркера). Статус: accepted, supersedes ADR-002.

- [ ] **Step 2: `.github/workflows/deploy.yml`:**

```yaml
name: deploy
on:
  push:
    branches: [master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: node --experimental-strip-types scripts/validate-content.mjs --strict
      - run: npm run build
        env:
          VITE_KORA_URL: ${{ vars.KORA_URL }}
          VITE_KORA_CLIENT_KEY: ${{ vars.KORA_CLIENT_KEY }}
      - run: npm run smoke
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: apps/web/dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

(KORA_CLIENT_KEY в repo **variables**, не secrets — он по спеке извлекаем из клиента, принятый риск; настоящие ключи NIM/Groq живут только в секретах воркера.)

- [ ] **Step 2b: Прекеш контента и арта (по спеке).** Скрипт `scripts/build-precache.mjs`: после `vite build` собирает список файлов `dist/**` (относительные пути `./...`) в `dist/precache.json`; в `sw.js` в install-обработчике: `fetch("./precache.json").then(r => r.json()).then(files => cache.addAll(files)).catch(() => cache.addAll(SHELL))`. Root `package.json`: `"build": "npm run build --workspaces --if-present && node scripts/build-precache.mjs"`. Smoke: `dist/precache.json` существует и содержит `./index.html`.

- [ ] **Step 3: Репозиторий и публикация** (gh authed; сначала снять прокси-переменные — известный trap):

```bash
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy gh repo create orbitquest --public --source . --push
```

Затем включить Pages (source = GitHub Actions): `gh api repos/{owner}/orbitquest/pages -X POST -f build_type=workflow` (если 409 — уже включено), перезапустить workflow при необходимости: `gh run watch`.

- [ ] **Step 4: Приёмка v1 по чек-листу спеки** — прогнать и записать результат в конец этого файла:

- [ ] новый профиль не попадает на Мостик до пролога/skip (проверка: инкогнито-вкладка на прод-URL);
- [ ] пролог 3–4 минуты, каждая сцена переживает перезагрузку;
- [ ] калибровка без сети (DevTools offline) и без LLM;
- [ ] три fixture-профиля → ожидаемые результаты (юнит-тесты Task 8) + ручной override работает;
- [ ] обе главы проходимы на 390×844 и 360×800 без горизонтального скролла;
- [ ] KORA: фолбэк с пометкой при недоступном воркере (живой ответ — после ручного деплоя воркера владельцем);
- [ ] воркер отвергает запросы без секрета/сверх бюджета (curl из README — после деплоя воркера);
- [ ] экспорт → очистка localStorage → импорт восстанавливает прогресс (на прод-URL);
- [ ] PWA ставится на Android c Pages — **проверка владельцем** (телефон);
- [ ] CI зелёный: typecheck + tests + validate:content --strict + build + smoke.

- [ ] **Step 5: Commit + push**

```bash
git add decisions/ADR-004-Runtime-LLM-NIM-Groq.md .github/workflows/deploy.yml
git commit -m "ci: GitHub Pages deploy pipeline + ADR-004 runtime LLM via kora-worker"
git push
```

---

## Порядок и зависимости

```text
T1 (PWA пути) ──┐
T2 (contracts content) ─→ T3 (contracts profile) ─→ T6 (storage+loader)
T2 ─→ T4 (пролог-контент+арт) ─→ T5 (валидатор) 
T6 + T4 ─→ T7 (пролог UI+Root)
T2 ─→ T8 (калибровка контент+скоринг) ─→ T9 (калибровка UI)
T3 ─→ T10 (движок миссий) ─→ T13 (плеер+оболочка) ← T11, T12 (контент глав)
T13 ─→ T14 (KORA клиент) ; T11+T12 ─→ T15 (kora-worker)
всё ─→ T16 (ADR+CI+деплой+приёмка)
```

## Что остаётся владельцу после плана

1. Деплой kora-worker (Cloudflare login) по `apps/kora-worker/README.md` + variables KORA_URL/KORA_CLIENT_KEY в GitHub.
2. Установка PWA на телефон с прод-URL (пункт приёмки).
3. Прохождение прологa+CODE-01 как первый игрок — фидбек по тону и сложности.

## Осознанно отложено (из спеки, не блокирует приёмку)

- Перекраска UI под утверждённый арт-стиль (жирные контуры, кислотные акценты) — отдельный проход после играбельного среза; текущий неон остаётся временным.
- `transfers`-миссии (повторные в новом контексте) — планировщик и `contextTag: "new"` заложены, контент повторных миссий появится со второй главой.
