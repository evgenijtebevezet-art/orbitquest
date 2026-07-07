import type { Profile } from "@orbitquest/contracts";

export function advanceScene(profile: Profile, sceneCount: number, name?: string): Profile {
  const next = { ...profile };
  if (typeof name === "string") next.navigatorName = name.trim() || "Навигатор";
  next.prologueSceneIndex = Math.min(profile.prologueSceneIndex + 1, sceneCount);
  if (next.prologueSceneIndex >= sceneCount) next.prologueDone = true;
  return next;
}

export function skipPrologue(profile: Profile): Profile {
  return { ...profile, prologueDone: true, prologueSceneIndex: Number.MAX_SAFE_INTEGER };
}
