import { createProfile, parseProfile, type Profile } from "@orbitquest/contracts";

const KEY = "orbitquest:profile";
const BACKUP_KEY = "orbitquest:profile:backup";

// Синхронизировано с content/index.json contentVersion; смок-тест сверяет.
export const APP_CONTENT_VERSION = "2026.07.08-1";

export function loadProfile(): Profile {
  const stored = localStorage.getItem(KEY);
  if (stored) {
    try {
      const parsed = parseProfile(JSON.parse(stored), APP_CONTENT_VERSION);
      if (parsed.ok) return parsed.profile;
    } catch {
      // мусор в хранилище — падаем в ветку замены ниже
    }
    localStorage.setItem(BACKUP_KEY, stored);
  }
  const fresh = createProfile(APP_CONTENT_VERSION);
  saveProfile(fresh);
  return fresh;
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function exportProfile(profile: Profile): string {
  return JSON.stringify(profile, null, 2);
}

export function importProfile(
  json: string,
): { ok: true; profile: Profile; contentMismatch: boolean } | { ok: false; error: string } {
  try {
    return parseProfile(JSON.parse(json), APP_CONTENT_VERSION);
  } catch {
    return { ok: false, error: "Файл не читается как JSON." };
  }
}
