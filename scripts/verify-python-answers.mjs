// Прогоняет код заданий predict-output-write через настоящий Python
// и сверяет фактический вывод с ключом ответа. Ловит фактические ошибки контента.
import { readdir, readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const dir = resolve(root, "content/missions");

function normalize(value) {
  return String(value)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter((line) => line.length > 0)
    .join("\n");
}

let failures = 0;
let checked = 0;
for (const file of (await readdir(dir)).filter((f) => f.endsWith(".json"))) {
  const mission = JSON.parse(await readFile(resolve(dir, file), "utf8"));
  for (const task of mission.tasks) {
    if (task.type !== "predict-output-write" || !task.code) continue;
    checked += 1;
    const tmp = resolve(root, `.tmp-check-${mission.id}-${task.id}.py`);
    await writeFile(tmp, task.code, "utf8");
    try {
      const { stdout } = await run("python", [tmp], {
        timeout: 5000,
        encoding: "utf8",
        env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      });
      if (normalize(stdout) !== normalize(task.answer)) {
        failures += 1;
        console.error(`MISMATCH ${mission.id}/${task.id}:\n  expected: ${JSON.stringify(task.answer)}\n  actual:   ${JSON.stringify(stdout.trim())}`);
      }
    } catch (error) {
      failures += 1;
      console.error(`RUN FAIL ${mission.id}/${task.id}: ${String(error).slice(0, 160)}`);
    } finally {
      await unlink(tmp).catch(() => {});
    }
  }
}
console.log(`checked ${checked} write-tasks, failures: ${failures}`);
process.exit(failures ? 1 : 0);
