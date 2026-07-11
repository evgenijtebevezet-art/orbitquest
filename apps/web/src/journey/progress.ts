import type { Journey, JourneyNode, Mission, Profile } from "@orbitquest/contracts";
import { missionAvailability } from "../missions/engine.ts";

export type JourneyNodeState = "locked" | "active" | "completed" | "skipped";

export interface JourneyNodeView {
  node: JourneyNode;
  state: JourneyNodeState;
}

/**
 * Состояния узлов тропы (Duolingo-модель):
 * - completed — миссия пройдена (включая созревшее повторение);
 * - skipped — пропущена калибровкой («уже знаешь»), если пропуски не отменены;
 * - active — первый непройденный узел, у которого ВСЕ предыдущие completed|skipped;
 * - locked — всё остальное.
 */
export function journeyNodeStates(
  profile: Profile,
  nodes: JourneyNode[],
  today: Date = new Date(),
): JourneyNodeView[] {
  let chainOpen = true; // все узлы до текущего пройдены или пропущены
  const views: JourneyNodeView[] = [];
  for (const node of nodes) {
    const availability = missionAvailability(profile, node.missionId, today);
    if (availability === "completed" || availability === "review") {
      views.push({ node, state: "completed" });
      continue;
    }
    if (availability === "skipped") {
      views.push({ node, state: "skipped" });
      continue;
    }
    if (chainOpen) {
      views.push({ node, state: "active" });
      chainOpen = false;
    } else {
      views.push({ node, state: "locked" });
    }
  }
  return views;
}

/** Первый активный узел = «миссия на сегодня»; если тропа пройдена — созревшее повторение. */
export function recommendJourneyMission(
  profile: Profile,
  journey: Journey,
  missionsById: Record<string, Mission>,
  today: Date = new Date(),
): string | null {
  const views = journeyNodeStates(profile, journey.nodes, today);
  const active = views.find((v) => v.state === "active" && missionsById[v.node.missionId]);
  if (active) return active.node.missionId;

  let dueId: string | null = null;
  let dueTime = Number.POSITIVE_INFINITY;
  for (const { node } of views) {
    const record = profile.missions[node.missionId];
    if (!record?.nextReviewAt || !missionsById[node.missionId]) continue;
    const time = new Date(record.nextReviewAt).getTime();
    if (time <= today.getTime() && time < dueTime) {
      dueId = node.missionId;
      dueTime = time;
    }
  }
  return dueId;
}

/** Индекс узла, у которого стоит корабль: конец пройденного префикса тропы; -1 = ещё на Земле. */
export function shipNodeIndex(views: JourneyNodeView[]): number {
  let index = -1;
  for (let i = 0; i < views.length; i += 1) {
    const state = views[i]!.state;
    if (state === "completed" || state === "skipped") index = i;
    else break;
  }
  return index;
}
