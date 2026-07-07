export interface AskKoraParams {
  missionId: string;
  taskId: string | null;
  hintStage: 0 | 1 | 2 | 3;
  question: string;
}

export interface AskKoraConfig {
  url?: string;
  clientKey?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export type AskKoraResult =
  | { live: true; text: string }
  | { live: false; reason: "no-config" | "network" | "http" | "timeout" };

function envConfig(): { url?: string; clientKey?: string } {
  try {
    return {
      url: import.meta.env.VITE_KORA_URL as string | undefined,
      clientKey: import.meta.env.VITE_KORA_CLIENT_KEY as string | undefined,
    };
  } catch {
    return {}; // node-тесты: import.meta.env отсутствует
  }
}

export async function askKora(params: AskKoraParams, config: AskKoraConfig = {}): Promise<AskKoraResult> {
  const env = envConfig();
  const url = "url" in config ? config.url : (config.url ?? env.url);
  const clientKey = "clientKey" in config ? config.clientKey : (config.clientKey ?? env.clientKey);
  const fetchFn = config.fetchFn ?? fetch;
  if (!url || !clientKey) return { live: false, reason: "no-config" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 12_000);
  try {
    const response = await fetchFn(`${url.replace(/\/$/, "")}/ask`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-oq-key": clientKey },
      body: JSON.stringify({
        missionId: params.missionId,
        taskId: params.taskId,
        hintStage: params.hintStage,
        question: params.question,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { live: false, reason: "http" };
    const body = (await response.json()) as { answer?: unknown };
    if (typeof body?.answer !== "string" || !body.answer) return { live: false, reason: "http" };
    return { live: true, text: body.answer };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { live: false, reason: "timeout" };
    }
    return { live: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}
