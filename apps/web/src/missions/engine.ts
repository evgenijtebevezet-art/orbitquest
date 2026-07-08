import type {
  AttemptRecord,
  Capability,
  Mission,
  MissionTask,
  Profile,
} from "@orbitquest/contracts";

export interface EngineState {
  phase: "briefing" | "task" | "result";
  taskIndex: number;
  attemptsLeft: number;
  hintStage: 0 | 1 | 2 | 3;
  taskStatus: "answering" | "wrong" | "resolved";
  resolvedCorrect: boolean;
  attempts: AttemptRecord[];
}

export type EngineEvent =
  | { type: "begin" }
  | { type: "answer"; key: string }
  | { type: "retry" }
  | { type: "hint" }
  | { type: "next" }
  | { type: "skip-bonus" };

const MAX_ATTEMPTS = 3; // первая попытка + две повторные

export function initialEngineState(): EngineState {
  return {
    phase: "briefing",
    taskIndex: 0,
    attemptsLeft: MAX_ATTEMPTS,
    hintStage: 0,
    taskStatus: "answering",
    resolvedCorrect: false,
    attempts: [],
  };
}

function normalizeOutput(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length > 0)
    .join("\n");
}

export function checkAnswer(task: MissionTask, key: string): boolean {
  if (task.type === "order-steps") {
    const identity = (task.lines ?? []).map((_, index) => index).join(",");
    return key === identity;
  }
  if (task.type === "predict-output-write") {
    return normalizeOutput(key) === normalizeOutput(task.answer);
  }
  return key === task.answer;
}

function bumpHint(stage: EngineState["hintStage"]): EngineState["hintStage"] {
  return Math.min(3, stage + 1) as EngineState["hintStage"];
}

export function engineReducer(
  state: EngineState,
  event: EngineEvent,
  mission: Mission,
  now: () => string = () => new Date().toISOString(),
): EngineState {
  switch (event.type) {
    case "begin": {
      if (state.phase !== "briefing") return state;
      return { ...state, phase: "task" };
    }
    case "answer": {
      if (state.phase !== "task" || state.taskStatus !== "answering") return state;
      const task = mission.tasks[state.taskIndex];
      if (!task) return state;
      const correct = checkAnswer(task, event.key);
      const attempt: AttemptRecord = {
        taskId: task.id,
        answerKey: event.key,
        correct,
        hintStage: state.hintStage,
        at: now(),
      };
      const attempts = [...state.attempts, attempt];
      if (correct) {
        return { ...state, attempts, taskStatus: "resolved", resolvedCorrect: true };
      }
      const attemptsLeft = state.attemptsLeft - 1;
      const hintStage = bumpHint(state.hintStage);
      if (attemptsLeft <= 0) {
        return { ...state, attempts, attemptsLeft: 0, hintStage, taskStatus: "resolved", resolvedCorrect: false };
      }
      return { ...state, attempts, attemptsLeft, hintStage, taskStatus: "wrong" };
    }
    case "retry": {
      if (state.phase !== "task" || state.taskStatus !== "wrong") return state;
      return { ...state, taskStatus: "answering" };
    }
    case "hint": {
      if (state.phase !== "task") return state;
      const currentTask = mission.tasks[state.taskIndex];
      const hasAttempt = state.attempts.some((a) => a.taskId === currentTask?.id);
      if (!hasAttempt) return state; // до первой содержательной попытки решение не выдаётся
      return { ...state, hintStage: bumpHint(state.hintStage) };
    }
    case "next": {
      if (state.phase !== "task" || state.taskStatus !== "resolved") return state;
      const nextIndex = state.taskIndex + 1;
      if (nextIndex >= mission.tasks.length) {
        return { ...state, phase: "result" };
      }
      return {
        ...state,
        taskIndex: nextIndex,
        attemptsLeft: MAX_ATTEMPTS,
        hintStage: 0,
        taskStatus: "answering",
        resolvedCorrect: false,
      };
    }
    case "skip-bonus": {
      // отказ от испытания KORA — миссия завершается без бонусных попыток
      if (state.phase !== "task" || !mission.tasks[state.taskIndex]?.bonus) return state;
      return { ...state, phase: "result" };
    }
  }
}

export function applyMissionResult(
  profile: Profile,
  mission: Mission,
  attempts: AttemptRecord[],
  today: Date,
): Profile {
  const completedAt = today.toISOString();
  const nextReviewAt = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  return {
    ...profile,
    missions: {
      ...profile.missions,
      [mission.id]: {
        missionId: mission.id,
        status: "completed",
        attempts,
        completedAt,
        nextReviewAt,
      },
    },
  };
}

const rank: Record<Capability, number> = { unknown: 0, recognizes: 1, applies: 2, transfers: 3 };

const applyTypes = new Set([
  "predict-output",
  "predict-output-write",
  "order-steps",
  "find-error-line",
  "spot-diff",
]);

export function deriveCapabilities(
  profile: Profile,
  missionsById: Record<string, Mission>,
): Record<string, Capability> {
  const capabilities: Record<string, Capability> = {
    ...(profile.calibration.result?.capabilities ?? {}),
  };

  for (const record of Object.values(profile.missions)) {
    const mission = missionsById[record.missionId];
    if (!mission) continue; // неизвестные ID сохраняются, но не учитываются
    const tasksById = new Map(mission.tasks.map((t) => [t.id, t]));
    for (const attempt of record.attempts) {
      if (!attempt.correct || attempt.hintStage !== 0) continue;
      const task = tasksById.get(attempt.taskId);
      if (!task) continue;
      let cap: Capability = "unknown";
      if (task.bonus) cap = "transfers"; // испытание KORA = перенос в усложнённый контекст
      else if (task.type === "choose-explanation") cap = "recognizes";
      else if (applyTypes.has(task.type)) cap = mission.contextTag === "new" ? "transfers" : "applies";
      if (rank[cap] > rank[capabilities[mission.skillId] ?? "unknown"]) {
        capabilities[mission.skillId] = cap;
      }
    }
    capabilities[mission.skillId] ??= "unknown";
  }
  return capabilities;
}

export type MissionAvailability = "new" | "skipped" | "completed" | "review";

export function missionAvailability(
  profile: Profile,
  missionId: string,
  today: Date = new Date(),
): MissionAvailability {
  const record = profile.missions[missionId];
  if (record?.status === "completed") {
    if (record.nextReviewAt && new Date(record.nextReviewAt).getTime() <= today.getTime()) {
      return "review";
    }
    return "completed";
  }
  const skipped =
    !profile.calibration.skipsOverridden &&
    (profile.calibration.result?.skipMissionIds ?? []).includes(missionId);
  return skipped ? "skipped" : "new";
}

export function recommendMission(
  profile: Profile,
  order: string[],
  missionsById: Record<string, Mission>,
  today: Date = new Date(),
): string | null {
  for (const missionId of order) {
    if (!missionsById[missionId]) continue;
    if (missionAvailability(profile, missionId, today) === "new") return missionId;
  }
  let dueId: string | null = null;
  let dueTime = Number.POSITIVE_INFINITY;
  for (const missionId of order) {
    const record = profile.missions[missionId];
    if (!record?.nextReviewAt) continue;
    const time = new Date(record.nextReviewAt).getTime();
    if (time <= today.getTime() && time < dueTime) {
      dueId = missionId;
      dueTime = time;
    }
  }
  return dueId;
}
