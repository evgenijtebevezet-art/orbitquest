import assert from "node:assert/strict";
import test from "node:test";

const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const { loadProfile, saveProfile, exportProfile, importProfile } = await import("./storage.ts");

test("loadProfile returns fresh profile when storage is empty", () => {
  store.clear();
  const p = loadProfile();
  assert.equal(p.prologueDone, false);
  assert.equal(p.profileVersion, 1);
});

test("save/load roundtrip", () => {
  store.clear();
  const p = loadProfile();
  p.navigatorName = "Женя";
  saveProfile(p);
  assert.equal(loadProfile().navigatorName, "Женя");
});

test("corrupted storage is backed up and replaced", () => {
  store.clear();
  store.set("orbitquest:profile", "{broken json");
  const p = loadProfile();
  assert.equal(p.prologueDone, false);
  assert.equal(store.get("orbitquest:profile:backup"), "{broken json");
});

test("incompatible (newer) stored profile is backed up and replaced", () => {
  store.clear();
  const p = loadProfile();
  const newer = exportProfile(p).replace('"profileVersion": 1', '"profileVersion": 99');
  store.set("orbitquest:profile", newer);
  const fresh = loadProfile();
  assert.equal(fresh.profileVersion, 1);
  assert.equal(store.get("orbitquest:profile:backup"), newer);
});

test("import rejects newer profileVersion, accepts valid export", () => {
  store.clear();
  const p = loadProfile();
  const exported = exportProfile(p);
  const good = importProfile(exported);
  assert.ok(good.ok);
  const bad = importProfile(exported.replace('"profileVersion": 1', '"profileVersion": 99'));
  assert.equal(bad.ok, false);
  const garbage = importProfile("{broken");
  assert.equal(garbage.ok, false);
});
