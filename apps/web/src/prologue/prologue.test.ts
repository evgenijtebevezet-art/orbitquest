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
  p = advanceScene(p, 7);
  p = advanceScene(p, 7); // index=2 (intro_kora)
  p = advanceScene(p, 7, "  Женя  ");
  assert.equal(p.navigatorName, "Женя");
  const q = advanceScene({ ...createProfile("v1"), prologueSceneIndex: 2 }, 7, "   ");
  assert.equal(q.navigatorName, "Навигатор");
});

test("skip completes prologue without touching name", () => {
  const p = skipPrologue(createProfile("v1"));
  assert.equal(p.prologueDone, true);
  assert.equal(p.navigatorName, "");
});
