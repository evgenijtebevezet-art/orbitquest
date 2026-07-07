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
  assert.equal(parseProfile(null, "v1").ok, false);
});

// fixture-тест миграции: v1 → v1 (identity). При bump до v2 сюда добавляется
// fixture старого профиля и проверка результата миграции.
test("migration chain reaches current version", () => {
  const fixtureV1 = createProfile("v1");
  const parsed = parseProfile(JSON.parse(JSON.stringify(fixtureV1)), "v1");
  assert.ok(parsed.ok);
  if (parsed.ok) assert.equal(parsed.profile.profileVersion, PROFILE_VERSION);
});
