import type {
  CalibrationAnswer,
  CalibrationItem,
  CalibrationResult,
  Capability,
} from "@orbitquest/contracts";

const rank: Record<Capability, number> = { unknown: 0, recognizes: 1, applies: 2, transfers: 3 };

export function scoreCalibration(
  items: CalibrationItem[],
  answers: CalibrationAnswer[],
): CalibrationResult {
  const byItem = new Map(answers.map((a) => [a.itemId, a]));
  const capabilities: Record<string, Capability> = {};
  const skipMissionIds: string[] = [];
  let codeConfidentCorrect = 0;

  for (const item of items) {
    const a = byItem.get(item.id);
    const correct = !!a && a.choiceId === item.answer;
    let cap: Capability = "unknown";
    if (correct && a.confident && item.type === "predict-output") cap = "applies";
    else if (correct && item.type === "choose-explanation") cap = "recognizes";
    if (rank[cap] > rank[capabilities[item.skillId] ?? "unknown"]) capabilities[item.skillId] = cap;
    else capabilities[item.skillId] ??= "unknown";
    if (correct && a.confident && item.skipsMissionId) skipMissionIds.push(item.skipsMissionId);
    if (correct && a.confident && item.skillId.startsWith("code.")) codeConfidentCorrect += 1;
  }

  return {
    capabilities,
    recommendedSector: codeConfidentCorrect >= 6 ? "agent" : "code",
    skipMissionIds,
  };
}
