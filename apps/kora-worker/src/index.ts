import { budgetKeys, checkRequest, validatePayload, type GuardEnv } from "./guard.ts";
import { buildMessages, type KoraContext } from "./prompt.ts";
import koraContextJson from "./kora-context.json";

interface Env extends GuardEnv {
  LIMITS: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  };
  DAILY_BUDGET?: string;
  NIM_API_KEY?: string;
  NIM_MODEL?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
}

const koraContext = koraContextJson as KoraContext;

const PER_IP_LIMIT = 40;
const ERROR_STREAK_LIMIT = 5;
const CIRCUIT_TTL_SECONDS = 600;

function json(status: number, body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": origin ?? "*",
      "access-control-allow-headers": "content-type,x-oq-key",
      "access-control-allow-methods": "POST,OPTIONS",
    },
  });
}

async function bumpCounter(env: Env, key: string, ttlSeconds: number): Promise<number> {
  const current = Number((await env.LIMITS.get(key)) ?? "0") + 1;
  await env.LIMITS.put(key, String(current), { expirationTtl: ttlSeconds });
  return current;
}

async function callModel(
  url: string,
  apiKey: string,
  model: string,
  messages: ReturnType<typeof buildMessages>,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: 400, temperature: 0.4 }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = body.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("empty answer");
    return answer;
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return json(204, {}, origin);
    if (url.pathname !== "/ask") return json(404, { error: "not found" }, origin);

    const rawBody = await request.text();
    const guard = checkRequest(
      {
        method: request.method,
        origin,
        clientKey: request.headers.get("x-oq-key"),
        bodyBytes: new TextEncoder().encode(rawBody).length,
      },
      env,
    );
    if (!guard.ok) return json(guard.status, { error: guard.error }, origin);

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return json(400, { error: "invalid json" }, origin);
    }
    const payload = validatePayload(parsedBody);
    if (!payload.ok) return json(400, { error: "invalid payload" }, origin);

    const now = new Date();
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const keys = budgetKeys(now, ip);
    const dailyBudget = Number(env.DAILY_BUDGET ?? "200");

    if ((await env.LIMITS.get("circuit:open")) === "1") {
      return json(503, { error: "circuit open" }, origin);
    }
    const daily = await bumpCounter(env, keys.daily, 172_800);
    if (daily > dailyBudget) return json(429, { error: "daily budget exhausted" }, origin);
    const perIp = await bumpCounter(env, keys.perIp, 172_800);
    if (perIp > PER_IP_LIMIT) return json(429, { error: "per-ip limit" }, origin);

    const messages = buildMessages(koraContext, payload.payload);
    const providers: Array<{ url: string; key?: string; model: string }> = [
      {
        url: "https://integrate.api.nvidia.com/v1/chat/completions",
        key: env.NIM_API_KEY,
        model: env.NIM_MODEL ?? "qwen/qwen3.5-397b-instruct",
      },
      {
        url: "https://api.groq.com/openai/v1/chat/completions",
        key: env.GROQ_API_KEY,
        model: env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      },
    ];

    for (const provider of providers) {
      if (!provider.key) continue;
      try {
        const answer = await callModel(provider.url, provider.key, provider.model, messages);
        await env.LIMITS.put("errors:streak", "0");
        return json(200, { answer, source: provider.url.includes("nvidia") ? "nim" : "groq" }, origin);
      } catch {
        const streak = Number((await env.LIMITS.get("errors:streak")) ?? "0") + 1;
        await env.LIMITS.put("errors:streak", String(streak));
        if (streak >= ERROR_STREAK_LIMIT) {
          await env.LIMITS.put("circuit:open", "1", { expirationTtl: CIRCUIT_TTL_SECONDS });
        }
      }
    }
    return json(502, { error: "all providers failed" }, origin);
  },
};
