import type { CalibrationItem, ContentIndex, Journey, Mission, PrologueScene } from "@orbitquest/contracts";
import contentIndexJson from "../../../../content/index.json";
import prologueScenesJson from "../../../../content/prologue/scenes.json";
import journeyJson from "../../../../content/journey.json";

export const contentIndex = contentIndexJson as ContentIndex;
export const prologueScenes = prologueScenesJson as PrologueScene[];
export const journey = journeyJson as Journey;

const missionModules = import.meta.glob("../../../../content/missions/*.json", {
  eager: true,
  import: "default",
});
export const missionsById: Record<string, Mission> = Object.fromEntries(
  Object.values(missionModules).map((m) => [(m as Mission).id, m as Mission]),
);

const calibrationModules = import.meta.glob("../../../../content/calibration/items.json", {
  eager: true,
  import: "default",
});
export const calibrationItems: CalibrationItem[] =
  (Object.values(calibrationModules)[0] as CalibrationItem[] | undefined) ?? [];

const artModules = import.meta.glob("../assets/prologue/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
export const prologueArt: Record<string, string> = Object.fromEntries(
  Object.entries(artModules).map(([path, url]) => [
    path.split("/").pop()!.replace(".webp", ""),
    url as string,
  ]),
);

const characterModules = import.meta.glob("../assets/characters/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
// ключи: kora | pix | vega
export const characterArt: Record<string, string> = Object.fromEntries(
  Object.entries(characterModules).map(([path, url]) => [
    path.split("/").pop()!.replace(".webp", ""),
    url as string,
  ]),
);
