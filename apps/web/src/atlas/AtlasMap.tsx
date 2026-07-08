import { useState, type CSSProperties } from "react";
import type { Capability, Mission, Profile, SectorId } from "@orbitquest/contracts";
import { deriveCapabilities, missionAvailability, type MissionAvailability } from "../missions/engine";
import { capNames, skillNames } from "../diagnostic/Calibration";

interface AtlasMapProps {
  profile: Profile;
  missionsById: Record<string, Mission>;
  order: string[];
  sector: SectorId;
  onStartMission: (missionId: string) => void;
}

const availabilityNames: Record<MissionAvailability, string> = {
  new: "не начата",
  skipped: "уже знаешь — можно пропустить",
  completed: "пройдена",
  review: "пора освежить",
};

export function AtlasMap({ profile, missionsById, order, sector, onStartMission }: AtlasMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(order[0] ?? null);
  const capabilities = deriveCapabilities(profile, missionsById);
  const today = new Date();
  const selected = selectedId ? missionsById[selectedId] : undefined;
  const selectedAvailability = selected ? missionAvailability(profile, selected.id, today) : null;

  return (
    <section className="deck-view atlas-view">
      <header className="deck-heading">
        <small>НАВИГАЦИОННАЯ ПАЛУБА · СОЗВЕЗДИЕ ATLAS</small>
        <h1>Карта навыков · {sector === "code" ? "Основы кода" : "AI-кодинг"}</h1>
        <p>Каждый спутник — один навык. Цвет показывает, что уже доказано ответами без подсказок.</p>
      </header>
      <div className="atlas-map">
        {order.map((missionId, index) => {
          const mission = missionsById[missionId];
          if (!mission) return null;
          const cap: Capability = capabilities[mission.skillId] ?? "unknown";
          const angle = (index / order.length) * 2 * Math.PI - Math.PI / 2;
          const x = 50 + 38 * Math.cos(angle);
          const y = 50 + 36 * Math.sin(angle);
          return (
            <button
              key={missionId}
              type="button"
              className={`skill-node cap-${cap} ${selectedId === missionId ? "selected" : ""}`}
              style={{ "--x": `${x}%`, "--y": `${y}%` } as CSSProperties}
              onClick={() => setSelectedId(missionId)}
            >
              <i />
              <b>{skillNames[mission.skillId] ?? mission.title}</b>
              <small>{capNames[cap]}</small>
            </button>
          );
        })}
      </div>
      {selected && selectedAvailability && (
        <div className="atlas-detail">
          <b>{skillNames[selected.skillId] ?? selected.title}</b>
          <span>
            {selected.title} · {availabilityNames[selectedAvailability]} · навык:{" "}
            {capNames[capabilities[selected.skillId] ?? "unknown"]}
          </span>
          <button type="button" className="prologue-action" onClick={() => onStartMission(selected.id)}>
            {selectedAvailability === "completed" || selectedAvailability === "review"
              ? "Пройти ещё раз"
              : "Начать миссию"}
          </button>
        </div>
      )}
    </section>
  );
}
