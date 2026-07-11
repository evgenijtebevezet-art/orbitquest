import assert from "node:assert/strict";
import test from "node:test";
import { createProfile, type Mission } from "@orbitquest/contracts";
import {
  applyMissionResult,
  checkAnswer,
  deriveCapabilities,
  engineReducer,
  initialEngineState,
  missionAvailability,
  recommendMission,
  type EngineState,
} from "./engine.ts";

const missionFixture: Mission = {
  id: "code-01",
  code: "CODE-01",
  sector: "code",
  satelliteId: "CODE-01",
  skillId: "code.literal",
  title: "Буквальность машины",
  why: "Зачем: понимать, что машина делает ровно то, что написано.",
  briefing: ["Наблюдение. Вопрос? Шаг."],
  durationMinutes: 12,
  contextTag: "familiar",
  koraFallback: "Читай строки по порядку.",
  tasks: [
    {
      id: "t1",
      type: "choose-explanation",
      prompt: "Что такое программа?",
      options: [
        { id: "a", label: "точная последовательность инструкций" },
        { id: "b", label: "список пожеланий" },
      ],
      answer: "a",
      hints: ["Вопрос?", "Направление.", "Разбор."],
      redTest: "Тест красный.",
      explain: "Разбор t1.",
    },
    {
      id: "t2",
      type: "predict-output",
      prompt: "Что напечатает?",
      code: 'print("Привет")',
      options: [
        { id: "a", label: "Привет" },
        { id: "b", label: "ничего" },
      ],
      answer: "a",
      hints: ["Вопрос?", "Направление.", "Разбор."],
      redTest: "Тест красный.",
      explain: "Разбор t2.",
      proof: true,
    },
  ],
};

const now = () => "2026-07-08T12:00:00.000Z";
const reduce = (state: EngineState, event: Parameters<typeof engineReducer>[1]) =>
  engineReducer(state, event, missionFixture, now);

test("happy path: correct answers walk briefing→tasks→result", () => {
  let s = initialEngineState();
  assert.equal(s.phase, "briefing");
  s = reduce(s, { type: "begin" });
  assert.equal(s.phase, "task");
  s = reduce(s, { type: "answer", key: "a" });
  assert.equal(s.taskStatus, "resolved");
  assert.equal(s.resolvedCorrect, true);
  s = reduce(s, { type: "next" });
  assert.equal(s.taskIndex, 1);
  assert.equal(s.taskStatus, "answering");
  assert.equal(s.attemptsLeft, 3);
  s = reduce(s, { type: "answer", key: "a" });
  s = reduce(s, { type: "next" });
  assert.equal(s.phase, "result");
  assert.equal(s.attempts.length, 2);
});

test("wrong answer opens next hint level and burns attempt", () => {
  let s = reduce(initialEngineState(), { type: "begin" });
  s = reduce(s, { type: "answer", key: "b" });
  assert.equal(s.taskStatus, "wrong");
  assert.equal(s.attemptsLeft, 2);
  assert.equal(s.hintStage, 1);
  assert.equal(s.attempts[0]!.correct, false);
  assert.equal(s.attempts[0]!.hintStage, 0);
  s = reduce(s, { type: "retry" });
  assert.equal(s.taskStatus, "answering");
});

test("three wrong answers resolve task with explain and mission continues", () => {
  let s = reduce(initialEngineState(), { type: "begin" });
  for (let i = 0; i < 3; i += 1) {
    if (s.taskStatus === "wrong") s = reduce(s, { type: "retry" });
    s = reduce(s, { type: "answer", key: "b" });
  }
  assert.equal(s.taskStatus, "resolved");
  assert.equal(s.resolvedCorrect, false);
  assert.equal(s.attemptsLeft, 0);
  s = reduce(s, { type: "next" });
  assert.equal(s.phase, "task");
  assert.equal(s.taskIndex, 1);
  s = reduce(s, { type: "answer", key: "a" });
  s = reduce(s, { type: "next" });
  assert.equal(s.phase, "result");
});

test("checkAnswer normalizes free-typed output", () => {
  const writeTask = {
    ...missionFixture.tasks[0]!,
    type: "predict-output-write" as const,
    code: "print(3 + 2)",
    answer: "5",
    options: undefined,
  };
  assert.equal(checkAnswer(writeTask, "  5  "), true);
  assert.equal(checkAnswer(writeTask, "5\n"), true);
  assert.equal(checkAnswer(writeTask, "six"), false);
  const multiline = { ...writeTask, answer: "один\nтри\nдва" };
  assert.equal(checkAnswer(multiline, "один \n три \n два"), true);
});

test("bonus task: skip ends mission, clean solve gives transfers", () => {
  const bonusMission: Mission = {
    ...missionFixture,
    tasks: [
      missionFixture.tasks[0]!,
      { ...missionFixture.tasks[1]!, id: "t2" },
      {
        ...missionFixture.tasks[0]!,
        id: "t3",
        prompt: "Испытание",
        proof: undefined,
        bonus: true,
      },
    ],
  };
  const r = (s: EngineState, e: Parameters<typeof engineReducer>[1]) =>
    engineReducer(s, e, bonusMission, now);
  let s = r(initialEngineState(), { type: "begin" });
  s = r(s, { type: "answer", key: "a" });
  s = r(s, { type: "next" });
  s = r(s, { type: "answer", key: "a" });
  s = r(s, { type: "next" });
  assert.equal(s.phase, "task"); // бонус предложен
  const skipped = r(s, { type: "skip-bonus" });
  assert.equal(skipped.phase, "result");

  s = r(s, { type: "answer", key: "a" });
  s = r(s, { type: "next" });
  assert.equal(s.phase, "result");

  const profile = createProfile("v1");
  profile.missions[bonusMission.id] = {
    missionId: bonusMission.id,
    status: "completed",
    attempts: [{ taskId: "t3", answerKey: "a", correct: true, hintStage: 0, at: now() }],
  };
  const caps = deriveCapabilities(profile, { [bonusMission.id]: bonusMission });
  assert.equal(caps[bonusMission.skillId], "transfers");
});

test("checkAnswer handles order-steps identity permutation", () => {
  const orderTask = {
    ...missionFixture.tasks[0]!,
    type: "order-steps" as const,
    lines: ["a", "b", "c"],
    initialOrder: [2, 0, 1],
    answer: "",
    options: undefined,
  };
  assert.equal(checkAnswer(orderTask, "0,1,2"), true);
  assert.equal(checkAnswer(orderTask, "2,0,1"), false);
});

test("manual hint event raises hint stage only after an attempt", () => {
  let s = reduce(initialEngineState(), { type: "begin" });
  s = reduce(s, { type: "hint" });
  assert.equal(s.hintStage, 0); // до первой содержательной попытки подсказки закрыты
  s = reduce(s, { type: "answer", key: "b" });
  s = reduce(s, { type: "hint" });
  assert.equal(s.hintStage, 2);
});

test("deriveCapabilities: clean predict answer -> applies; hinted -> keeps calibration level", () => {
  const profile = createProfile("v1");
  profile.calibration.result = {
    capabilities: { "code.literal": "recognizes" },
    recommendedSector: "code",
    skipMissionIds: [],
  };
  profile.missions["code-01"] = {
    missionId: "code-01",
    status: "completed",
    attempts: [
      { taskId: "t1", answerKey: "a", correct: true, hintStage: 0, at: now() },
      { taskId: "t2", answerKey: "a", correct: true, hintStage: 0, at: now() },
    ],
  };
  const caps = deriveCapabilities(profile, { "code-01": missionFixture });
  assert.equal(caps["code.literal"], "applies");

  const hintedProfile = createProfile("v1");
  hintedProfile.calibration.result = profile.calibration.result;
  hintedProfile.missions["code-01"] = {
    missionId: "code-01",
    status: "completed",
    attempts: [{ taskId: "t2", answerKey: "a", correct: true, hintStage: 2, at: now() }],
  };
  const hintedCaps = deriveCapabilities(hintedProfile, { "code-01": missionFixture });
  assert.equal(hintedCaps["code.literal"], "recognizes");
});

test("recommendMission skips calibration-skipped missions unless overridden", () => {
  const profile = createProfile("v1");
  profile.sector = "code";
  profile.calibration.result = {
    capabilities: {},
    recommendedSector: "code",
    skipMissionIds: ["code-01"],
  };
  const order = ["code-01", "code-02"];
  const missions = {
    "code-01": missionFixture,
    "code-02": { ...missionFixture, id: "code-02", skillId: "code.variables" },
  };
  const today = new Date("2026-07-08");
  assert.equal(recommendMission(profile, order, missions, today), "code-02");
  profile.calibration.skipsOverridden = true;
  assert.equal(recommendMission(profile, order, missions, today), "code-01");
});

test("recommendMission returns review mission when all completed and due", () => {
  const profile = createProfile("v1");
  profile.sector = "code";
  profile.missions["code-01"] = {
    missionId: "code-01",
    status: "completed",
    attempts: [],
    completedAt: "2026-07-01T00:00:00.000Z",
    nextReviewAt: "2026-07-05T00:00:00.000Z",
  };
  const order = ["code-01"];
  const missions = { "code-01": missionFixture };
  assert.equal(recommendMission(profile, order, missions, new Date("2026-07-08")), "code-01");
  assert.equal(recommendMission(profile, order, missions, new Date("2026-07-03")), null);
});

test("applyMissionResult stores record with review date and preserves unknown records", () => {
  let profile = createProfile("v1");
  profile.missions["ghost-99"] = { missionId: "ghost-99", status: "completed", attempts: [] };
  const attempts = [{ taskId: "t1", answerKey: "a", correct: true, hintStage: 0 as const, at: now() }];
  profile = applyMissionResult(profile, missionFixture, attempts, new Date("2026-07-08T12:00:00Z"));
  const record = profile.missions["code-01"];
  assert.ok(record);
  assert.equal(record.status, "completed");
  assert.equal(record.nextReviewAt, "2026-07-15T12:00:00.000Z");
  assert.ok(profile.missions["ghost-99"]);
});

test("missionAvailability reflects profile state", () => {
  const profile = createProfile("v1");
  profile.calibration.result = {
    capabilities: {},
    recommendedSector: "code",
    skipMissionIds: ["code-02"],
  };
  profile.missions["code-01"] = {
    missionId: "code-01",
    status: "completed",
    attempts: [],
    completedAt: "2026-07-01T00:00:00.000Z",
    nextReviewAt: "2026-07-05T00:00:00.000Z",
  };
  assert.equal(missionAvailability(profile, "code-01", new Date("2026-07-08")), "review");
  assert.equal(missionAvailability(profile, "code-01", new Date("2026-07-02")), "completed");
  assert.equal(missionAvailability(profile, "code-02", new Date("2026-07-08")), "skipped");
  assert.equal(missionAvailability(profile, "code-03", new Date("2026-07-08")), "new");
});
