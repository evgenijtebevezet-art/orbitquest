// Генерирует hint-safe контекст для kora-worker из content/missions:
// брифинг и формулировки заданий БЕЗ ключей ответов, опций, подсказок и разборов.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const index = JSON.parse(await readFile(resolve(root, "content/index.json"), "utf8"));
const context = {};

for (const id of [...index.missionOrder.code, ...index.missionOrder.agent]) {
  const mission = JSON.parse(await readFile(resolve(root, `content/missions/${id}.json`), "utf8"));
  context[id] = {
    title: mission.title,
    why: mission.why,
    briefing: mission.briefing,
    tasks: Object.fromEntries(
      mission.tasks.map((task) => [
        task.id,
        {
          prompt: task.prompt,
          ...(task.code ? { code: task.code } : {}),
          ...(task.codeB ? { codeB: task.codeB } : {}),
        },
      ]),
    ),
  };
}

const target = resolve(import.meta.dirname, "../src/kora-context.json");
await writeFile(target, JSON.stringify(context, null, 2) + "\n", "utf8");
console.log(`kora-context.json: ${Object.keys(context).length} missions`);
