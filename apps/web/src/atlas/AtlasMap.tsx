import { useState, type CSSProperties } from "react";
import type { Capability, Mission, Profile } from "@orbitquest/contracts";
import { deriveCapabilities, missionAvailability, type MissionAvailability } from "../missions/engine";
import { capNames, skillNames } from "../diagnostic/Calibration";

interface AtlasMapProps {
  profile: Profile;
  missionsById: Record<string, Mission>;
  /** id миссий в порядке прохождения путешествия; навыки дедуплицируются по skillId */
  missionIds: string[];
  onStartMission: (missionId: string) => void;
}

const availabilityNames: Record<MissionAvailability, string> = {
  new: "не начата",
  skipped: "уже знаешь — можно пропустить",
  completed: "пройдена",
  review: "пора освежить",
};

interface SkillEntry {
  skillId: string;
  missions: Mission[];
}

function collectSkills(missionIds: string[], missionsById: Record<string, Mission>): SkillEntry[] {
  const entries: SkillEntry[] = [];
  const byId = new Map<string, SkillEntry>();
  for (const missionId of missionIds) {
    const mission = missionsById[missionId];
    if (!mission) continue;
    const existing = byId.get(mission.skillId);
    if (existing) {
      existing.missions.push(mission);
    } else {
      const entry: SkillEntry = { skillId: mission.skillId, missions: [mission] };
      byId.set(mission.skillId, entry);
      entries.push(entry);
    }
  }
  return entries;
}

export function AtlasMap({ profile, missionsById, missionIds, onStartMission }: AtlasMapProps) {
  const skills = collectSkills(missionIds, missionsById);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(skills[0]?.skillId ?? null);
  const capabilities = deriveCapabilities(profile, missionsById);
  const today = new Date();
  const selected = skills.find((entry) => entry.skillId === selectedSkillId);
  // представитель навыка: первая непройденная миссия, иначе первая по порядку тропы
  const selectedMission = selected
    ? selected.missions.find((m) => {
        const availability = missionAvailability(profile, m.id, today);
        return availability === "new" || availability === "review";
      }) ?? selected.missions[0]
    : undefined;
  const selectedAvailability = selectedMission
    ? missionAvailability(profile, selectedMission.id, today)
    : null;

  return (
    <section className="deck-view atlas-view">
      <header className="deck-heading">
        <small>НАВИГАЦИОННАЯ ПАЛУБА · СОЗВЕЗДИЕ ATLAS</small>
        <h1>Карта навыков</h1>
        <p>Каждый спутник — один навык. Цвет показывает, что уже доказано ответами без подсказок.</p>
      </header>
      <div className="atlas-map">
        {skills.map((entry, index) => {
          const cap: Capability = capabilities[entry.skillId] ?? "unknown";
          const angle = (index / skills.length) * 2 * Math.PI - Math.PI / 2;
          const x = 50 + 38 * Math.cos(angle);
          const y = 50 + 36 * Math.sin(angle);
          return (
            <button
              key={entry.skillId}
              type="button"
              className={`skill-node cap-${cap} ${selectedSkillId === entry.skillId ? "selected" : ""}`}
              style={{ "--x": `${x}%`, "--y": `${y}%` } as CSSProperties}
              onClick={() => setSelectedSkillId(entry.skillId)}
            >
              <i />
              <b>{skillNames[entry.skillId] ?? entry.skillId}</b>
              <small>{capNames[cap]}</small>
            </button>
          );
        })}
      </div>
      {selected && selectedMission && selectedAvailability && (
        <div className="atlas-detail">
          <b>{skillNames[selected.skillId] ?? selected.skillId}</b>
          <span>
            {selectedMission.title} · {availabilityNames[selectedAvailability]} · навык:{" "}
            {capNames[capabilities[selected.skillId] ?? "unknown"]}
          </span>
          <button type="button" className="prologue-action" onClick={() => onStartMission(selectedMission.id)}>
            {selectedAvailability === "completed" || selectedAvailability === "review"
              ? "Пройти ещё раз"
              : "Начать миссию"}
          </button>
        </div>
      )}
    </section>
  );
}
