export const deckIds = ["bridge", "atlas", "radar", "hangar"] as const;

export type DeckId = (typeof deckIds)[number];

export const missionPhaseIds = ["signal", "briefing", "repair", "simulation", "complete"] as const;

export type MissionPhaseId = (typeof missionPhaseIds)[number];

export interface MissionSummary {
  id: string;
  code: string;
  sector: string;
  title: string;
  objective: string;
  durationMinutes: number;
  satelliteId: string;
  sourceLabel: string;
}

export interface ShipStatus {
  name: string;
  registry: string;
  atlasConnection: "stable" | "degraded" | "offline";
  cycleDays: number;
  constellationStability: number;
  restoredSatellites: number;
  attentionChannels: number;
}

export interface BootstrapResponse {
  navigator: {
    displayName: string;
    rank: string;
  };
  ship: ShipStatus;
  activeMission: MissionSummary;
  unreadSignals: number;
}

export function isBootstrapResponse(value: unknown): value is BootstrapResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<BootstrapResponse>;
  return Boolean(
    candidate.navigator?.displayName &&
      candidate.ship?.name &&
      candidate.activeMission?.id &&
      typeof candidate.unreadSignals === "number",
  );
}
