import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import type { Journey, Mission, Profile } from "@orbitquest/contracts";
import journeyArtUrl from "../assets/journey/journey-map.webp";
import {
  journeyNodeStates,
  recommendJourneyMission,
  shipNodeIndex,
  type JourneyNodeView,
} from "./progress";

const stateIcons = { locked: "🔒", completed: "✓", skipped: "✓", active: "" } as const;

const stateLabels = {
  locked: "закрыт",
  completed: "пройдена",
  skipped: "уже знаешь",
  active: "доступна",
} as const;

interface JourneyMapProps {
  profile: Profile;
  journey: Journey;
  missionsById: Record<string, Mission>;
  onStartMission: (missionId: string) => void;
}

export function JourneyMap({ profile, journey, missionsById, onStartMission }: JourneyMapProps) {
  const today = useMemo(() => new Date(), []);
  const views = journeyNodeStates(profile, journey.nodes, today);
  const recommendedId = recommendJourneyMission(profile, journey, missionsById, today);
  const recommended = recommendedId ? missionsById[recommendedId] : undefined;
  const shipIndex = shipNodeIndex(views);
  const activeRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [lockedHint, setLockedHint] = useState<string | null>(null);

  // старт с текущего места тропы: активный узел в центр, без узла — низ карты (Земля)
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "center" });
    } else {
      canvasRef.current?.scrollIntoView({ block: "end" });
    }
  }, []);

  useEffect(() => {
    if (!lockedHint) return;
    const timer = setTimeout(() => setLockedHint(null), 3500);
    return () => clearTimeout(timer);
  }, [lockedHint]);

  function handleNodeTap(view: JourneyNodeView) {
    const mission = missionsById[view.node.missionId];
    if (!mission) return;
    if (view.state === "locked") {
      const gate = recommended ? `Сначала — «${recommended.title}»` : "Сначала пройди предыдущие узлы";
      setLockedHint(gate);
      return;
    }
    onStartMission(mission.id);
  }

  // корабль: у последнего пройденного узла; до старта — у Земли (низ тропы)
  const shipPos =
    shipIndex >= 0
      ? { x: views[shipIndex]!.node.x, y: views[shipIndex]!.node.y }
      : { x: 50, y: 93 };

  const recommendedNode = recommendedId
    ? journey.nodes.find((n) => n.missionId === recommendedId)
    : undefined;
  const recommendedStage = recommendedNode
    ? journey.stages.find((s) => s.id === recommendedNode.stage)
    : undefined;

  return (
    <div className="journey-wrap">
      <div className="journey-canvas" ref={canvasRef}>
        <img className="journey-art" src={journeyArtUrl} alt="Карта путешествия: Земля, МКС, Луна, Марс" />
        <motion.div
          className="ship-marker"
          aria-hidden="true"
          initial={false}
          animate={{ left: `${shipPos.x - 7}%`, top: `${shipPos.y + 1.6}%` }}
          transition={{ type: "spring", stiffness: 60, damping: 14 }}
        >
          🚀
        </motion.div>
        {views.map((view) => {
          const mission = missionsById[view.node.missionId];
          if (!mission) return null;
          const emergency = view.node.kind === "emergency";
          return (
            <button
              key={view.node.missionId}
              ref={view.state === "active" ? activeRef : undefined}
              type="button"
              className={`journey-node state-${view.state}${emergency ? " emergency" : ""}`}
              style={{ "--x": `${view.node.x}%`, "--y": `${view.node.y}%` } as CSSProperties}
              aria-label={`${mission.title} — ${emergency ? "авария, " : ""}${stateLabels[view.state]}`}
              onClick={() => handleNodeTap(view)}
            >
              {view.state === "active" && (
                <motion.i
                  className="node-pulse"
                  aria-hidden="true"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.85, 0.25, 0.85] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              <span className="node-face">{emergency ? "⚠" : stateIcons[view.state]}</span>
              <small className="node-code">{mission.code}</small>
              {view.state === "skipped" && <small className="node-note">уже знаешь</small>}
            </button>
          );
        })}
      </div>

      <div className="journey-daily" aria-live="polite">
        {lockedHint && <p className="locked-hint">🔒 {lockedHint}</p>}
        {recommended ? (
          <article className="mission-card recommended-card daily-card">
            <header>
              <span>МИССИЯ НА СЕГОДНЯ</span>
              <small>
                {recommendedStage ? `${recommendedStage.title} · ` : ""}≈ {recommended.durationMinutes} мин
              </small>
            </header>
            <h2>
              {recommendedNode?.kind === "emergency" && <span className="alert-tag">⚠ ТРЕВОГА</span>}
              {recommended.title}
            </h2>
            <button type="button" className="prologue-action" onClick={() => onStartMission(recommended.id)}>
              Играть
            </button>
          </article>
        ) : (
          <article className="mission-card daily-card">
            <h2>Тропа пройдена</h2>
            <p>Все узлы маршрута закрыты, повторения ещё не созрели. Загляни позже.</p>
          </article>
        )}
      </div>
    </div>
  );
}
