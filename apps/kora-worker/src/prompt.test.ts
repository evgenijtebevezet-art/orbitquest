import assert from "node:assert/strict";
import test from "node:test";
import { buildMessages, type KoraContext } from "./prompt.ts";

const context: KoraContext = {
  "code-01": {
    title: "Буквальность машины",
    why: "Зачем: понимать буквальность.",
    briefing: ["Наблюдение. Вопрос? Шаг."],
    tasks: {
      t1: { prompt: "Что такое программа?", code: 'print("Привет")' },
    },
  },
};

test("system prompt encodes canon and hint stage limits", () => {
  const messages = buildMessages(context, {
    missionId: "code-01",
    taskId: "t1",
    hintStage: 1,
    question: "Почему машина не догадывается?",
  });
  const system = messages[0]!.content;
  assert.match(system, /наблюдение → вопрос → следующий шаг/i);
  assert.match(system, /не выдавай готовое решение/i);
  assert.match(system, /уровень подсказки: 1/i);
  const user = messages[1]!.content;
  assert.match(user, /Что такое программа\?/);
  assert.match(user, /Почему машина не догадывается\?/);
});

test("unknown mission/task still builds safe messages", () => {
  const messages = buildMessages(context, {
    missionId: "ghost",
    taskId: null,
    hintStage: 0,
    question: "Общий вопрос",
  });
  assert.equal(messages.length, 2);
  assert.match(messages[1]!.content, /Общий вопрос/);
});
