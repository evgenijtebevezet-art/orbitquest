import assert from "node:assert/strict";
import test from "node:test";
import { askKora, type AskKoraParams } from "./askKora.ts";

const params: AskKoraParams = {
  missionId: "code-01",
  taskId: "t1",
  hintStage: 1,
  question: "Почему машина не догадывается?",
};

test("returns no-config fallback when url or key missing", async () => {
  const result = await askKora(params, { url: undefined, clientKey: undefined });
  assert.deepEqual(result, { live: false, reason: "no-config" });
});

test("returns live text on 200 {answer}", async () => {
  const fetchFn = (async () =>
    new Response(JSON.stringify({ answer: "Наблюдение: машина буквальна." }), {
      status: 200,
    })) as typeof fetch;
  const result = await askKora(params, { url: "https://kora.test", clientKey: "k", fetchFn });
  assert.deepEqual(result, { live: true, text: "Наблюдение: машина буквальна." });
});

test("returns http fallback on 429/500 and on empty answer", async () => {
  for (const status of [429, 500]) {
    const fetchFn = (async () => new Response("err", { status })) as typeof fetch;
    const result = await askKora(params, { url: "https://kora.test", clientKey: "k", fetchFn });
    assert.deepEqual(result, { live: false, reason: "http" });
  }
  const emptyFn = (async () => new Response(JSON.stringify({ answer: "" }), { status: 200 })) as typeof fetch;
  assert.deepEqual(await askKora(params, { url: "https://kora.test", clientKey: "k", fetchFn: emptyFn }), {
    live: false,
    reason: "http",
  });
});

test("returns timeout fallback when fetch hangs past timeoutMs", async () => {
  const fetchFn = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError")),
      );
    })) as typeof fetch;
  const result = await askKora(params, {
    url: "https://kora.test",
    clientKey: "k",
    timeoutMs: 30,
    fetchFn,
  });
  assert.deepEqual(result, { live: false, reason: "timeout" });
});

test("returns network fallback on thrown fetch", async () => {
  const fetchFn = (async () => {
    throw new TypeError("network down");
  }) as typeof fetch;
  const result = await askKora(params, { url: "https://kora.test", clientKey: "k", fetchFn });
  assert.deepEqual(result, { live: false, reason: "network" });
});

test("sends x-oq-key header and only the whitelisted payload fields", async () => {
  const calls: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
  const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: init?.headers as Record<string, string>,
      body: String(init?.body),
    });
    return new Response(JSON.stringify({ answer: "ok" }), { status: 200 });
  }) as typeof fetch;
  await askKora(params, { url: "https://kora.test/", clientKey: "secret", fetchFn });
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.url, "https://kora.test/ask");
  assert.equal(call.headers["x-oq-key"], "secret");
  const body = JSON.parse(call.body) as Record<string, unknown>;
  assert.deepEqual(Object.keys(body).sort(), ["hintStage", "missionId", "question", "taskId"]);
});
