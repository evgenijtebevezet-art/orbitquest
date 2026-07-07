import { isBootstrapResponse, type BootstrapResponse } from "@orbitquest/contracts";

export const offlineBootstrap: BootstrapResponse = {
  navigator: { displayName: "Gento", rank: "Синхронизатор" },
  ship: {
    name: "Odyssey",
    registry: "NQ-07",
    atlasConnection: "stable",
    cycleDays: 12,
    constellationStability: 78,
    restoredSatellites: 24,
    attentionChannels: 3,
  },
  activeMission: {
    id: "tools-permissions-001",
    code: "03-14",
    sector: "AI Coding / Agent Systems",
    title: "Восстановить канал Tools",
    objective: "Отделить выбор инструмента моделью от разрешения backend и исправить небезопасный вызов.",
    durationMinutes: 12,
    satelliteId: "TOOLS-03",
    sourceLabel: "Official documentation",
  },
  unreadSignals: 3,
};

export async function loadBootstrap(signal?: AbortSignal): Promise<BootstrapResponse> {
  if (!import.meta.env.DEV) return offlineBootstrap;
  const response = await fetch("/api/bootstrap", { signal });
  if (!response.ok) throw new Error(`Bootstrap failed: ${response.status}`);

  const body: unknown = await response.json();
  if (!isBootstrapResponse(body)) throw new Error("Bootstrap contract mismatch");
  return body;
}
