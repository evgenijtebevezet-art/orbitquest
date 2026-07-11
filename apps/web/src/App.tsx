import { useRef, useState } from "react";
import { motion } from "motion/react";
import type { AttemptRecord, Mission, Profile } from "@orbitquest/contracts";
import { characterArt, journey, missionsById } from "./content/loader";
import { applyMissionResult } from "./missions/engine";
import { MissionPlayer } from "./missions/MissionPlayer";
import { AtlasMap } from "./atlas/AtlasMap";
import { JourneyMap } from "./journey/JourneyMap";
import { journeyNodeStates, recommendJourneyMission } from "./journey/progress";
import { exportProfile, importProfile } from "./profile/storage";

type DeckId = "journey" | "atlas" | "profile";

const allDecks: Array<{ id: DeckId; icon: string; label: string }> = [
  { id: "journey", icon: "☄", label: "Путешествие" },
  { id: "atlas", icon: "✦", label: "Карта навыков" },
  { id: "profile", icon: "⌗", label: "Профиль" },
];

const SHIP = { name: "Odyssey", registry: "NQ-07" };

const journeyMissionIds = journey.nodes.map((node) => node.missionId);
const emergencyMissionIds = new Set(
  journey.nodes.filter((node) => node.kind === "emergency").map((node) => node.missionId),
);

function countCompleted(profile: Profile): number {
  return Object.values(profile.missions).filter(
    (record) => record.status === "completed" && missionsById[record.missionId],
  ).length;
}

interface AppProps {
  profile: Profile;
  onProfileChange: (updater: (p: Profile) => Profile) => void;
}

export function App({ profile, onProfileChange }: AppProps) {
  const completedTotal = countCompleted(profile);

  const [activeDeck, setActiveDeck] = useState<DeckId>("journey");
  // первый заход после калибровки — сразу в первый узел тропы, без экранов-посредников
  const [activeMissionId, setActiveMissionId] = useState<string | null>(() =>
    completedTotal === 0 ? recommendJourneyMission(profile, journey, missionsById, new Date()) : null,
  );

  const decks = completedTotal >= 1 ? allDecks : allDecks.slice(0, 1);
  const activeMission = activeMissionId ? missionsById[activeMissionId] : undefined;

  function handleComplete(mission: Mission) {
    return (attempts: AttemptRecord[]) => {
      onProfileChange((p) => applyMissionResult(p, mission, attempts, new Date()));
    };
  }

  if (activeMission) {
    return (
      <MissionPlayer
        mission={activeMission}
        emergency={emergencyMissionIds.has(activeMission.id)}
        onExit={() => setActiveMissionId(null)}
        onComplete={handleComplete(activeMission)}
      />
    );
  }

  const nodeViews = journeyNodeStates(profile, journey.nodes, new Date());
  const passedCount = nodeViews.filter((v) => v.state === "completed" || v.state === "skipped").length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setActiveDeck("journey")}>
          <span className="brand-mark">
            <i />
          </span>
          <span>
            <b>ORBIT</b>QUEST
          </span>
        </button>
        <div className="ship-meta">
          <small>
            {SHIP.name} · {SHIP.registry}
          </small>
          <strong>
            <i /> РЕЙС: ЗЕМЛЯ → МАРС
          </strong>
        </div>
      </header>

      <aside className="rail" aria-label="Разделы">
        <span className="rail-title">РАЗДЕЛЫ</span>
        {decks.map((deck, index) => (
          <button
            key={deck.id}
            type="button"
            className={activeDeck === deck.id ? "active" : ""}
            onClick={() => setActiveDeck(deck.id)}
          >
            <span>{deck.icon}</span>
            <b>{deck.label}</b>
            <small>0{index + 1}</small>
          </button>
        ))}
        <div className="navigator-card">
          <span>{(profile.navigatorName || "НВ").slice(0, 2).toUpperCase()}</span>
          <div>
            <b>Навигатор {profile.navigatorName || "без имени"}</b>
            <small>
              узлов пройдено: {passedCount}/{journey.nodes.length}
            </small>
          </div>
        </div>
      </aside>

      <main className="main-viewport">
        {activeDeck === "journey" && (
          <section className="deck-view journey-view" aria-labelledby="journey-title">
            <header className="deck-heading">
              <small>МАРШРУТ · ГЛАВА 1</small>
              <h1 id="journey-title">Путешествие Odyssey</h1>
              <p>
                Пройдено {passedCount} из {journey.nodes.length} узлов тропы. Одна миссия в день —
                хороший темп; больше — твой выбор.
              </p>
            </header>
            {completedTotal === 1 && (
              <motion.div
                className="kora-note"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {characterArt.kora && <img className="dialog-portrait sm" src={characterArt.kora} alt="KORA" />}
                <p>
                  <b>KORA:</b> Первый узел тропы закрыт — палуба навигации проснулась. Внизу появилась
                  «Карта навыков»: там видно, что уже доказано делом.
                </p>
              </motion.div>
            )}
            <JourneyMap
              profile={profile}
              journey={journey}
              missionsById={missionsById}
              onStartMission={setActiveMissionId}
            />
          </section>
        )}
        {activeDeck === "atlas" && (
          <AtlasMap
            profile={profile}
            missionsById={missionsById}
            missionIds={journeyMissionIds}
            onStartMission={(id) => setActiveMissionId(id)}
          />
        )}
        {activeDeck === "profile" && <ProfileDeck profile={profile} onProfileChange={onProfileChange} />}
      </main>

      {decks.length > 1 && (
        <nav className="mobile-dock" aria-label="Основная навигация">
          {decks.map((deck) => (
            <button
              key={deck.id}
              type="button"
              className={activeDeck === deck.id ? "active" : ""}
              onClick={() => setActiveDeck(deck.id)}
            >
              <span>{deck.icon}</span>
              <small>{deck.label}</small>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function ProfileDeck({
  profile,
  onProfileChange,
}: {
  profile: Profile;
  onProfileChange: (updater: (p: Profile) => Profile) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  function handleExport() {
    const blob = new Blob([exportProfile(profile)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "orbitquest-profile.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = importProfile(String(reader.result));
      if (!parsed.ok) {
        setImportError(parsed.error);
        return;
      }
      if (!window.confirm("Заменить текущий прогресс данными из файла?")) return;
      setImportError(null);
      onProfileChange(() => parsed.profile);
    };
    reader.readAsText(file);
  }

  function redoCalibration() {
    if (!window.confirm("Пройти калибровку заново? Ответы прошлой калибровки будут очищены.")) return;
    onProfileChange((p) => ({
      ...p,
      sector: null,
      calibration: { answers: [], result: null, done: false, skipsOverridden: false },
    }));
  }

  function replayPrologue() {
    onProfileChange((p) => ({ ...p, prologueDone: false, prologueSceneIndex: 0 }));
  }

  return (
    <section className="deck-view profile-view">
      <header className="deck-heading">
        <small>ЛИЧНЫЙ ОТСЕК</small>
        <h1>Навигатор {profile.navigatorName || "без имени"}</h1>
        <p>
          Прогресс хранится только на этом устройстве. Экспортируй файл, чтобы не потерять его или
          перенести на другой телефон.
        </p>
      </header>
      <div className="profile-actions">
        <button type="button" className="prologue-action" onClick={handleExport}>
          Сохранить прогресс в файл
        </button>
        <button type="button" className="option" onClick={() => fileInputRef.current?.click()}>
          Загрузить из файла (заменит текущий прогресс)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleImportFile(file);
            event.target.value = "";
          }}
        />
        {importError && <p className="import-error">{importError}</p>}
        <button type="button" className="option" onClick={redoCalibration}>
          Пройти калибровку заново
        </button>
        <button type="button" className="option" onClick={replayPrologue}>
          Пересмотреть пролог
        </button>
      </div>
    </section>
  );
}
