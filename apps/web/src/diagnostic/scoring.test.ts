import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import type { CalibrationAnswer, CalibrationItem } from "@orbitquest/contracts";
import { scoreCalibration } from "./scoring.ts";

const items = JSON.parse(
  await readFile(new URL("../../../../content/calibration/items.json", import.meta.url), "utf8"),
) as CalibrationItem[];

const answer = (itemId: string, choiceId: string, confident: boolean): CalibrationAnswer => ({
  itemId,
  choiceId,
  confident,
});

test("fixture novice: all dont-know -> code sector, no skips, all unknown", () => {
  const result = scoreCalibration(items, items.map((i) => answer(i.id, "dont-know", false)));
  assert.equal(result.recommendedSector, "code");
  assert.deepEqual(result.skipMissionIds, []);
  assert.ok(Object.values(result.capabilities).every((c) => c === "unknown"));
});

test("fixture mixed: q1-q3 confident-correct -> skips code-01..03, code sector", () => {
  const result = scoreCalibration(
    items,
    items.map((i) =>
      ["q1", "q2", "q3"].includes(i.id) ? answer(i.id, i.answer, true) : answer(i.id, "dont-know", false),
    ),
  );
  assert.deepEqual(result.skipMissionIds, ["code-01", "code-02", "code-03"]);
  assert.equal(result.recommendedSector, "code");
  assert.equal(result.capabilities["code.variables"], "applies");
  assert.equal(result.capabilities["code.literal"], "recognizes");
});

test("fixture strong-code: q1-q6 confident-correct -> agent sector recommended", () => {
  const result = scoreCalibration(
    items,
    items.map((i) =>
      ["q1", "q2", "q3", "q4", "q5", "q6"].includes(i.id)
        ? answer(i.id, i.answer, true)
        : answer(i.id, "dont-know", false),
    ),
  );
  assert.equal(result.recommendedSector, "agent");
});

test("unconfident correct answer builds no applies capability and no skip", () => {
  const result = scoreCalibration(items, [answer("q2", "b", false)]);
  assert.deepEqual(result.skipMissionIds, []);
  assert.equal(result.capabilities["code.variables"], "unknown");
});

test("confident wrong answer is not rewarded", () => {
  const result = scoreCalibration(items, [answer("q2", "a", true)]);
  assert.deepEqual(result.skipMissionIds, []);
  assert.equal(result.capabilities["code.variables"], "unknown");
});
