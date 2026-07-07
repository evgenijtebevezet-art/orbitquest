export interface GuardEnv {
  ALLOWED_ORIGINS: string; // csv доменов
  CLIENT_KEY: string;
}

export interface RequestFacts {
  method: string;
  origin: string | null;
  clientKey: string | null;
  bodyBytes: number;
}

export type GuardResult = { ok: true } | { ok: false; status: number; error: string };

const MAX_BODY_BYTES = 4 * 1024;

export function checkRequest(facts: RequestFacts, env: GuardEnv): GuardResult {
  if (facts.method !== "POST") return { ok: false, status: 405, error: "POST only" };
  if (facts.origin) {
    const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    if (!allowed.includes(facts.origin)) return { ok: false, status: 403, error: "origin not allowed" };
  }
  if (!facts.clientKey || facts.clientKey !== env.CLIENT_KEY) {
    return { ok: false, status: 401, error: "bad client key" };
  }
  if (facts.bodyBytes > MAX_BODY_BYTES) return { ok: false, status: 413, error: "body too large" };
  return { ok: true };
}

export interface AskPayload {
  missionId: string;
  taskId: string | null;
  hintStage: 0 | 1 | 2 | 3;
  question: string;
}

const allowedFields = new Set(["missionId", "taskId", "hintStage", "question"]);

export function validatePayload(body: unknown): { ok: true; payload: AskPayload } | { ok: false } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false };
  const raw = body as Record<string, unknown>;
  // лишние поля (в т.ч. попытка передать ответы) — отказ
  if (Object.keys(raw).some((key) => !allowedFields.has(key))) return { ok: false };
  if (typeof raw.missionId !== "string" || !raw.missionId) return { ok: false };
  const taskId = raw.taskId ?? null;
  if (taskId !== null && (typeof taskId !== "string" || !taskId)) return { ok: false };
  if (typeof raw.hintStage !== "number" || ![0, 1, 2, 3].includes(raw.hintStage)) return { ok: false };
  if (typeof raw.question !== "string" || !raw.question.trim() || raw.question.length > 600) {
    return { ok: false };
  }
  return {
    ok: true,
    payload: {
      missionId: raw.missionId,
      taskId: taskId as string | null,
      hintStage: raw.hintStage as 0 | 1 | 2 | 3,
      question: raw.question,
    },
  };
}

export function budgetKeys(now: Date, ip: string): { daily: string; perIp: string } {
  const day = now.toISOString().slice(0, 10);
  return { daily: `budget:${day}`, perIp: `ip:${day}:${ip}` };
}
