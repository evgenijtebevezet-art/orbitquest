import assert from "node:assert/strict";
import test from "node:test";
import { budgetKeys, checkRequest, validatePayload } from "./guard.ts";

const env = { ALLOWED_ORIGINS: "https://gento.github.io", CLIENT_KEY: "secret" };
const goodRequest = {
  method: "POST",
  origin: "https://gento.github.io",
  clientKey: "secret",
  bodyBytes: 200,
};

test("accepts a valid request", () => {
  assert.deepEqual(checkRequest(goodRequest, env), { ok: true });
});

test("rejects non-POST with 405", () => {
  const result = checkRequest({ ...goodRequest, method: "GET" }, env);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 405);
});

test("rejects foreign origin with 403, allows missing origin", () => {
  const bad = checkRequest({ ...goodRequest, origin: "https://evil.example" }, env);
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.status, 403);
  assert.deepEqual(checkRequest({ ...goodRequest, origin: null }, env), { ok: true });
});

test("rejects wrong client key with 401", () => {
  const result = checkRequest({ ...goodRequest, clientKey: "nope" }, env);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 401);
});

test("rejects oversized body with 413", () => {
  const result = checkRequest({ ...goodRequest, bodyBytes: 5000 }, env);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});

test("validatePayload accepts whitelisted fields only", () => {
  const good = validatePayload({ missionId: "code-01", taskId: "t1", hintStage: 1, question: "Почему?" });
  assert.ok(good.ok);
  assert.equal(validatePayload({ missionId: "code-01", hintStage: 0, question: "q", answer: "a" }).ok, false);
  assert.equal(validatePayload({ missionId: "", hintStage: 0, question: "q" }).ok, false);
  assert.equal(validatePayload({ missionId: "code-01", hintStage: 9, question: "q" }).ok, false);
  assert.equal(validatePayload({ missionId: "code-01", hintStage: 0, question: "x".repeat(700) }).ok, false);
  assert.equal(validatePayload("not an object").ok, false);
});

test("budgetKeys are date-scoped", () => {
  const keys = budgetKeys(new Date("2026-07-08T15:00:00Z"), "1.2.3.4");
  assert.equal(keys.daily, "budget:2026-07-08");
  assert.equal(keys.perIp, "ip:2026-07-08:1.2.3.4");
});
