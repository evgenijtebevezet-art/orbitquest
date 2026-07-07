import type { BootstrapResponse } from "@orbitquest/contracts";

export const bootstrapResponse: BootstrapResponse = {
  navigator: {
    displayName: "Gento",
    rank: "Синхронизатор",
  },
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
