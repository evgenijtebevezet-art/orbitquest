import type { Capability, RouteId, SectorId } from "./content.ts";

export const PROFILE_VERSION = 1;

export interface AttemptRecord {
  taskId: string;
  answerKey: string;
  correct: boolean;
  hintStage: 0 | 1 | 2 | 3;
  at: string; // ISO
}

export interface MissionRecord {
  missionId: string;
  status: "in-progress" | "completed";
  attempts: AttemptRecord[];
  completedAt?: string;
  nextReviewAt?: string;
}

export interface CalibrationAnswer {
  itemId: string;
  choiceId: string; // "dont-know" = честное «не знаю»
  confident: boolean;
}

export interface CalibrationResult {
  capabilities: Record<string, Capability>;
  recommendedSector: SectorId;
  skipMissionIds: string[];
}

export interface Profile {
  profileVersion: number;
  contentVersion: string;
  navigatorName: string;
  prologueSceneIndex: number;
  prologueDone: boolean;
  calibration: {
    answers: CalibrationAnswer[];
    result: CalibrationResult | null;
    done: boolean;
    skipsOverridden: boolean; // игрок выбрал «пройти всё подряд»
  };
  sector: SectorId | null;
  route: RouteId; // v1: всегда foundation, измерение независимо от сектора
  missions: Record<string, MissionRecord>; // неизвестные ID никогда не удаляются
}

export function createProfile(contentVersion: string): Profile {
  return {
    profileVersion: PROFILE_VERSION,
    contentVersion,
    navigatorName: "",
    prologueSceneIndex: 0,
    prologueDone: false,
    calibration: { answers: [], result: null, done: false, skipsOverridden: false },
    sector: null,
    route: "foundation",
    missions: {},
  };
}

// Миграции: ключ N — функция, поднимающая профиль с версии N до N+1.
// На каждый bump PROFILE_VERSION сюда добавляется функция + fixture-тест.
const migrations: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {};

function validateShape(raw: Record<string, unknown>): string | null {
  if (typeof raw.contentVersion !== "string") return "contentVersion: string required";
  if (typeof raw.navigatorName !== "string") return "navigatorName: string required";
  if (typeof raw.prologueSceneIndex !== "number") return "prologueSceneIndex: number required";
  if (typeof raw.prologueDone !== "boolean") return "prologueDone: boolean required";
  const cal = raw.calibration as Record<string, unknown> | undefined;
  if (!cal || !Array.isArray(cal.answers) || typeof cal.done !== "boolean") return "calibration: invalid";
  if (raw.sector !== null && raw.sector !== "code" && raw.sector !== "agent") return "sector: invalid";
  if (!raw.missions || typeof raw.missions !== "object" || Array.isArray(raw.missions))
    return "missions: object required";
  for (const [id, rec] of Object.entries(raw.missions as Record<string, unknown>)) {
    const r = rec as Record<string, unknown> | null;
    if (!r || r.missionId !== id || !Array.isArray(r.attempts)) return `missions.${id}: invalid record`;
    if (r.status !== "in-progress" && r.status !== "completed") return `missions.${id}.status: invalid`;
  }
  return null;
}

export function parseProfile(
  raw: unknown,
  appContentVersion: string,
): { ok: true; profile: Profile; contentMismatch: boolean } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "Файл не похож на профиль OrbitQuest." };
  }
  let data = { ...(raw as Record<string, unknown>) };
  const version = data.profileVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: "В файле нет корректного profileVersion." };
  }
  if (version > PROFILE_VERSION) {
    return {
      ok: false,
      error: `Профиль новее приложения (профиль v${version}, приложение v${PROFILE_VERSION}). Обнови приложение.`,
    };
  }
  for (let v = version; v < PROFILE_VERSION; v += 1) {
    const migrate = migrations[v];
    if (!migrate) return { ok: false, error: `Нет миграции с версии ${v}.` };
    data = migrate(data);
  }
  data.profileVersion = PROFILE_VERSION;
  const shapeError = validateShape(data);
  if (shapeError) return { ok: false, error: `Профиль не прошёл проверку: ${shapeError}` };
  const profile = data as unknown as Profile;
  const contentMismatch = profile.contentVersion !== appContentVersion;
  return { ok: true, profile, contentMismatch };
}
