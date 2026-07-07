import assert from "node:assert/strict";
import test from "node:test";
import {
  validateMission,
  validateContentIndex,
  validateCalibrationItems,
  validatePrologueScenes,
} from "./content.ts";

const goodTask = {
  id: "t1",
  type: "choose-explanation",
  prompt: "Что такое программа?",
  options: [
    { id: "a", label: "точная последовательность инструкций" },
    { id: "b", label: "список пожеланий" },
  ],
  answer: "a",
  hints: ["Наводящий вопрос?", "Направление.", "Разбор."],
  redTest: "Тест красный.",
  explain: "Разбор задания.",
};

const goodMission = {
  id: "code-01",
  code: "CODE-01",
  sector: "code",
  satelliteId: "CODE-01",
  skillId: "code.literal",
  title: "Буквальность машины",
  why: "Зачем: чтобы понимать, что машина делает ровно то, что написано.",
  briefing: ["KORA: наблюдение. Вопрос? Шаг."],
  durationMinutes: 12,
  contextTag: "familiar",
  tasks: [goodTask],
  koraFallback: "Смотри на строки по порядку.",
};

test("valid mission passes", () => {
  assert.deepEqual(validateMission(goodMission), []);
});

test("mission with unknown answer id fails", () => {
  const bad = { ...goodMission, tasks: [{ ...goodTask, answer: "zzz" }] };
  assert.ok(validateMission(bad).some((e) => e.includes("answer")));
});

test("order-steps requires lines and initialOrder permutation", () => {
  const order = {
    ...goodTask,
    id: "t2",
    type: "order-steps",
    options: undefined,
    answer: "",
    lines: ["a = 2", "b = 3", "print(a + b)"],
    initialOrder: [2, 0, 1],
  };
  assert.deepEqual(validateMission({ ...goodMission, tasks: [order] }), []);
  const bad = { ...order, initialOrder: [0, 0, 1] };
  assert.ok(
    validateMission({ ...goodMission, tasks: [bad] }).some((e) => e.includes("initialOrder")),
  );
});

test("find-error-line answer must be a valid 1-based line", () => {
  const find = {
    ...goodTask,
    id: "t3",
    type: "find-error-line",
    options: undefined,
    code: "print(1)\nprin(2)",
    answer: "2",
  };
  assert.deepEqual(validateMission({ ...goodMission, tasks: [find] }), []);
  assert.ok(
    validateMission({ ...goodMission, tasks: [{ ...find, answer: "9" }] })
      .some((e) => e.includes("answer")),
  );
});

test("proof task must be last and unique", () => {
  const proofFirst = {
    ...goodMission,
    tasks: [{ ...goodTask, proof: true }, { ...goodTask, id: "t2" }],
  };
  assert.ok(validateMission(proofFirst).some((e) => e.includes("proof")));
});

test("content index validates order and version", () => {
  assert.deepEqual(
    validateContentIndex({
      contentVersion: "2026.07.08-1",
      missionOrder: { code: ["code-01"], agent: ["agent-01"] },
    }),
    [],
  );
  assert.ok(validateContentIndex({ missionOrder: {} }).length > 0);
});

test("calibration items validate", () => {
  assert.deepEqual(
    validateCalibrationItems([
      {
        id: "q1",
        skillId: "code.literal",
        type: "choose-explanation",
        prompt: 'Что напечатает print("2+2")?',
        options: [
          { id: "a", label: "2+2" },
          { id: "b", label: "4" },
          { id: "c", label: "ошибку" },
          { id: "d", label: "ничего" },
        ],
        answer: "a",
        skipsMissionId: "code-01",
      },
      {
        id: "q2",
        skillId: "code.variables",
        type: "predict-output",
        prompt: "Что напечатает программа?",
        code: "x = 7\nprint(x)",
        options: [
          { id: "a", label: "7" },
          { id: "b", label: "x" },
        ],
        answer: "a",
      },
      { id: "q3", skillId: "s", type: "choose-explanation", prompt: "p", options: [{ id: "a", label: "l" }, { id: "b", label: "m" }], answer: "a" },
      { id: "q4", skillId: "s", type: "choose-explanation", prompt: "p", options: [{ id: "a", label: "l" }, { id: "b", label: "m" }], answer: "a" },
      { id: "q5", skillId: "s", type: "choose-explanation", prompt: "p", options: [{ id: "a", label: "l" }, { id: "b", label: "m" }], answer: "a" },
      { id: "q6", skillId: "s", type: "choose-explanation", prompt: "p", options: [{ id: "a", label: "l" }, { id: "b", label: "m" }], answer: "a" },
    ]),
    [],
  );
  assert.ok(validateCalibrationItems([{ id: "q1" }]).length > 0);
});

test("prologue scenes validate", () => {
  const scene = (id: string) => ({
    id,
    art: "scene-1-invitation",
    title: "Приглашение Atlas",
    speaker: "ATLAS",
    paragraphs: ["ВХОДЯЩЕЕ ПОДКЛЮЧЕНИЕ"],
    actionLabel: "Принять подключение",
  });
  const scenes = ["intro_invitation", "intro_ship", "intro_kora", "intro_atlas", "intro_vega", "intro_pix"]
    .map(scene);
  assert.deepEqual(validatePrologueScenes(scenes), []);
  assert.ok(validatePrologueScenes([{ id: "x" }]).length > 0);
});
