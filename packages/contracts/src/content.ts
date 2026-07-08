export const sectorIds = ["code", "agent"] as const;
export type SectorId = (typeof sectorIds)[number];

export const routeIds = ["foundation", "practice", "delta"] as const;
export type RouteId = (typeof routeIds)[number];

export const capabilityLevels = ["unknown", "recognizes", "applies", "transfers"] as const;
export type Capability = (typeof capabilityLevels)[number];

export const taskTypes = [
  "choose-explanation",
  "predict-output",
  "order-steps",
  "find-error-line",
  "spot-diff",
] as const;
export type TaskType = (typeof taskTypes)[number];

export interface TaskOption {
  id: string;
  label: string;
}

export interface CrewLine {
  speaker: "KORA" | "PIX" | "VEGA";
  text: string;
}

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
  interlude?: CrewLine[]; // 1–2 реплики экипажа после решения задания
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

export const prologueSpeakers = ["ATLAS", "SYSTEM", "KORA", "VEGA", "PIX"] as const;
export type PrologueSpeaker = (typeof prologueSpeakers)[number];

export interface PrologueScene {
  id: string;
  art: string;
  title: string;
  speaker: PrologueSpeaker;
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

export interface JourneyStage {
  id: string; // "earth-iss"
  title: string; // «Земля → МКС»
  from: string;
  to: string;
}

export interface JourneyNode {
  missionId: string;
  stage: string; // JourneyStage.id
  x: number; // позиция узла на полотне карты, % (0..100)
  y: number;
  kind: "mission" | "emergency";
}

export interface Journey {
  stages: JourneyStage[];
  nodes: JourneyNode[]; // порядок массива = порядок прохождения
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function pushIf(errors: string[], condition: boolean, message: string): void {
  if (condition) errors.push(message);
}

export function validateTask(value: unknown, path: string): string[] {
  const errors: string[] = [];
  const t = value as Partial<MissionTask> | null | undefined;
  pushIf(errors, !isNonEmptyString(t?.id), `${path}.id: required`);
  pushIf(errors, !taskTypes.includes(t?.type as TaskType), `${path}.type: one of ${taskTypes.join("|")}`);
  pushIf(errors, !isNonEmptyString(t?.prompt), `${path}.prompt: required`);
  pushIf(
    errors,
    !Array.isArray(t?.hints) || t.hints.length !== 3 || !t.hints.every(isNonEmptyString),
    `${path}.hints: exactly 3 non-empty strings`,
  );
  pushIf(errors, !isNonEmptyString(t?.redTest), `${path}.redTest: required`);
  pushIf(errors, !isNonEmptyString(t?.explain), `${path}.explain: required`);

  const interlude = t?.interlude;
  if (interlude !== undefined) {
    pushIf(
      errors,
      !Array.isArray(interlude) || interlude.length < 1 || interlude.length > 2,
      `${path}.interlude: 1..2 lines`,
    );
    if (Array.isArray(interlude)) {
      interlude.forEach((line, i) => {
        pushIf(
          errors,
          line?.speaker !== "KORA" && line?.speaker !== "PIX" && line?.speaker !== "VEGA",
          `${path}.interlude[${i}].speaker: KORA|PIX|VEGA`,
        );
        pushIf(errors, !isNonEmptyString(line?.text), `${path}.interlude[${i}].text: required`);
      });
    }
  }

  if (t?.type === "order-steps") {
    const lines = t.lines ?? [];
    const order = t.initialOrder ?? [];
    pushIf(errors, !Array.isArray(t.lines) || lines.length < 2, `${path}.lines: >=2 lines required`);
    const isPermutation =
      order.length === lines.length &&
      [...order].sort((a, b) => a - b).every((v, i) => v === i);
    pushIf(errors, !isPermutation, `${path}.initialOrder: must be a permutation of 0..${lines.length - 1}`);
    const isIdentity = order.length > 0 && order.every((v, i) => v === i);
    pushIf(errors, isIdentity, `${path}.initialOrder: must actually shuffle`);
  } else if (t?.type === "find-error-line") {
    pushIf(errors, !isNonEmptyString(t?.code), `${path}.code: required`);
    const lineCount = (t?.code ?? "").split("\n").length;
    const n = Number(t?.answer);
    pushIf(
      errors,
      !Number.isInteger(n) || n < 1 || n > lineCount,
      `${path}.answer: 1-based line number within code (1..${lineCount})`,
    );
  } else if (t) {
    const options = t.options ?? [];
    pushIf(errors, options.length < 2, `${path}.options: >=2 required`);
    pushIf(
      errors,
      options.some((o) => !isNonEmptyString(o?.id) || !isNonEmptyString(o?.label)),
      `${path}.options: id and label required`,
    );
    pushIf(
      errors,
      new Set(options.map((o) => o?.id)).size !== options.length,
      `${path}.options: duplicate ids`,
    );
    pushIf(errors, !options.some((o) => o?.id === t.answer), `${path}.answer: must match an option id`);
    if (t.type === "spot-diff") pushIf(errors, !isNonEmptyString(t.codeB), `${path}.codeB: required for spot-diff`);
    if (t.type === "predict-output" || t.type === "spot-diff")
      pushIf(errors, !isNonEmptyString(t.code), `${path}.code: required`);
  }
  return errors;
}

export function validateMission(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["mission: object required"];
  const m = value as Partial<Mission>;
  pushIf(errors, !isNonEmptyString(m.id), "id: required");
  pushIf(errors, !isNonEmptyString(m.code), "code: required");
  pushIf(errors, !sectorIds.includes(m.sector as SectorId), `sector: one of ${sectorIds.join("|")}`);
  pushIf(errors, !isNonEmptyString(m.satelliteId), "satelliteId: required");
  pushIf(errors, !isNonEmptyString(m.skillId), "skillId: required");
  pushIf(errors, !isNonEmptyString(m.title), "title: required");
  pushIf(errors, !isNonEmptyString(m.why), "why: required");
  pushIf(errors, !isStringArray(m.briefing), "briefing: non-empty array of strings");
  pushIf(
    errors,
    typeof m.durationMinutes !== "number" || m.durationMinutes < 5 || m.durationMinutes > 25,
    "durationMinutes: number 5..25",
  );
  pushIf(errors, m.contextTag !== "familiar" && m.contextTag !== "new", "contextTag: familiar|new");
  pushIf(errors, !isNonEmptyString(m.koraFallback), "koraFallback: required");

  const tasks = Array.isArray(m.tasks) ? m.tasks : [];
  pushIf(errors, tasks.length < 1 || tasks.length > 5, "tasks: 1..5 required");
  pushIf(errors, new Set(tasks.map((t) => t?.id)).size !== tasks.length, "tasks: duplicate ids");
  const proofIndexes = tasks.flatMap((t, i) => (t?.proof ? [i] : []));
  pushIf(
    errors,
    proofIndexes.length > 1 || (proofIndexes.length === 1 && proofIndexes[0] !== tasks.length - 1),
    "tasks: proof task must be single and last",
  );
  tasks.forEach((task, index) => errors.push(...validateTask(task, `tasks[${index}]`)));
  return errors;
}

export function validateContentIndex(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["index: object required"];
  const idx = value as Partial<ContentIndex>;
  pushIf(errors, !isNonEmptyString(idx.contentVersion), "contentVersion: required");
  const order = idx.missionOrder as Record<string, unknown> | undefined;
  for (const sector of sectorIds) {
    const list = order?.[sector];
    if (!isStringArray(list)) {
      errors.push(`missionOrder.${sector}: non-empty array of mission ids`);
      continue;
    }
    pushIf(errors, new Set(list).size !== list.length, `missionOrder.${sector}: duplicate ids`);
  }
  return errors;
}

export function validateJourney(value: unknown, missionIds?: string[]): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["journey: object required"];
  const j = value as Partial<Journey>;
  const stages = Array.isArray(j.stages) ? j.stages : [];
  const nodes = Array.isArray(j.nodes) ? j.nodes : [];
  pushIf(errors, stages.length < 1, "stages: >=1 required");
  pushIf(errors, nodes.length < 1, "nodes: >=1 required");
  const stageIds = new Set<string>();
  stages.forEach((stage, i) => {
    pushIf(errors, !isNonEmptyString(stage?.id), `stages[${i}].id: required`);
    pushIf(errors, !isNonEmptyString(stage?.title), `stages[${i}].title: required`);
    pushIf(errors, !isNonEmptyString(stage?.from) || !isNonEmptyString(stage?.to), `stages[${i}].from/to: required`);
    pushIf(errors, stageIds.has(stage?.id as string), `stages[${i}].id: duplicate`);
    stageIds.add(stage?.id as string);
  });
  const seen = new Set<string>();
  nodes.forEach((node, i) => {
    pushIf(errors, !isNonEmptyString(node?.missionId), `nodes[${i}].missionId: required`);
    pushIf(errors, seen.has(node?.missionId as string), `nodes[${i}].missionId: duplicate`);
    seen.add(node?.missionId as string);
    pushIf(errors, !stageIds.has(node?.stage as string), `nodes[${i}].stage: unknown stage`);
    pushIf(
      errors,
      typeof node?.x !== "number" || node.x < 0 || node.x > 100 ||
        typeof node?.y !== "number" || node.y < 0 || node.y > 100,
      `nodes[${i}].x/y: percent 0..100`,
    );
    pushIf(errors, node?.kind !== "mission" && node?.kind !== "emergency", `nodes[${i}].kind: mission|emergency`);
    if (missionIds) {
      pushIf(errors, !missionIds.includes(node?.missionId as string), `nodes[${i}].missionId: no such mission`);
    }
  });
  return errors;
}

export function validateCalibrationItems(value: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(value)) return ["calibration: array required"];
  pushIf(errors, value.length < 6 || value.length > 8, "calibration: 6..8 items required");
  pushIf(
    errors,
    new Set(value.map((item) => (item as Partial<CalibrationItem>)?.id)).size !== value.length,
    "calibration: duplicate ids",
  );
  value.forEach((raw, index) => {
    const item = raw as Partial<CalibrationItem> | null | undefined;
    const path = `items[${index}]`;
    pushIf(errors, !isNonEmptyString(item?.id), `${path}.id: required`);
    pushIf(errors, !isNonEmptyString(item?.skillId), `${path}.skillId: required`);
    pushIf(
      errors,
      item?.type !== "choose-explanation" && item?.type !== "predict-output",
      `${path}.type: choose-explanation|predict-output`,
    );
    pushIf(errors, !isNonEmptyString(item?.prompt), `${path}.prompt: required`);
    if (item?.type === "predict-output") pushIf(errors, !isNonEmptyString(item.code), `${path}.code: required`);
    const options = item?.options ?? [];
    pushIf(errors, options.length < 2, `${path}.options: >=2 required`);
    pushIf(
      errors,
      options.some((o) => !isNonEmptyString(o?.id) || !isNonEmptyString(o?.label)),
      `${path}.options: id and label required`,
    );
    pushIf(errors, !options.some((o) => o?.id === item?.answer), `${path}.answer: must match an option id`);
  });
  return errors;
}

export function validatePrologueScenes(value: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(value)) return ["prologue: array required"];
  pushIf(errors, value.length < 6 || value.length > 7, "prologue: 6..7 scenes required");
  pushIf(
    errors,
    new Set(value.map((scene) => (scene as Partial<PrologueScene>)?.id)).size !== value.length,
    "prologue: duplicate scene ids",
  );
  value.forEach((raw, index) => {
    const scene = raw as Partial<PrologueScene> | null | undefined;
    const path = `scenes[${index}]`;
    pushIf(
      errors,
      !isNonEmptyString(scene?.id) || !scene!.id!.startsWith("intro_"),
      `${path}.id: required, must start with intro_`,
    );
    pushIf(errors, !isNonEmptyString(scene?.art), `${path}.art: required`);
    pushIf(errors, !isNonEmptyString(scene?.title), `${path}.title: required`);
    pushIf(
      errors,
      !prologueSpeakers.includes(scene?.speaker as PrologueSpeaker),
      `${path}.speaker: one of ${prologueSpeakers.join("|")}`,
    );
    pushIf(errors, !isStringArray(scene?.paragraphs), `${path}.paragraphs: non-empty array of strings`);
    pushIf(errors, !isNonEmptyString(scene?.actionLabel), `${path}.actionLabel: required`);
  });
  return errors;
}
