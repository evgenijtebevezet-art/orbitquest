import { useRef, useState } from "react";
import { motion } from "motion/react";
import type { AttemptRecord, Mission, Profile, SectorId } from "@orbitquest/contracts";
import { characterArt, contentIndex, missionsById } from "./content/loader";
import { applyMissionResult, missionAvailability, recommendMission } from "./missions/engine";
import { MissionPlayer } from "./missions/MissionPlayer";
import { AtlasMap } from "./atlas/AtlasMap";
import { sectorNames } from "./diagnostic/Calibration";
import { exportProfile, importProfile } from "./profile/storage";

type DeckId = "bridge" | "atlas" | "profile";

const allDecks: Array<{ id: DeckId; icon: string; label: string }> = [
  { id: "bridge", icon: "⌂", label: "Играть" },
  { id: "atlas", icon: "✦", label: "Карта навыков" },
  { id: "profile", icon: "⌗", label: "Профиль" },
];

const SHIP = { name: "Odyssey", registry: "NQ-07" };

const availabilityLabels = {
  new: "не начата",
  skipped: "уже знаешь — можно пропустить",
  completed: "пройдена ✓",
  review: "пора освежить",
} as const;

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
  const sector: SectorId = profile.sector ?? "code";
  const order = contentIndex.missionOrder[sector];
  const completedTotal = countCompleted(profile);

  const [activeDeck, setActiveDeck] = useState<DeckId>("bridge");
  // первый заход после калибровки — сразу в миссию дня, без экранов-посредников
  const [activeMissionId, setActiveMissionId] = useState<string | null>(() =>
    completedTotal === 0 ? recommendMission(profile, order, missionsById, new Date()) : null,
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
        onExit={() => setActiveMissionId(null)}
        onComplete={handleComplete(activeMission)}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setActiveDeck("bridge")}>
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
            <i /> КУРС: {sectorNames[sector].toUpperCase()}
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
            <small>курс: {sectorNames[sector]}</small>
          </div>
        </div>
      </aside>

      <main className="main-viewport">
        {activeDeck === "bridge" && (
          <Bridge
            profile={profile}
            sector={sector}
            order={order}
            completedTotal={completedTotal}
            onStartMission={setActiveMissionId}
            onSwitchSector={(next) => onProfileChange((p) => ({ ...p, sector: next }))}
          />
        )}
        {activeDeck === "atlas" && (
          <AtlasMap
            profile={profile}
            missionsById={missionsById}
            order={order}
            sector={sector}
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

interface BridgeProps {
  profile: Profile;
  sector: SectorId;
  order: string[];
  completedTotal: number;
  onStartMission: (missionId: string) => void;
  onSwitchSector: (sector: SectorId) => void;
}

function Bridge({ profile, sector, order, completedTotal, onStartMission, onSwitchSector }: BridgeProps) {
  const today = new Date();
  const recommendedId = recommendMission(profile, order, missionsById, today);
  const recommended = recommendedId ? missionsById[recommendedId] : undefined;
  const completedInSector = order.filter(
    (id) => missionAvailability(profile, id, today) === "completed",
  ).length;
  const otherSector: SectorId = sector === "code" ? "agent" : "code";

  return (
    <section className="deck-view bridge-view-v2" aria-labelledby="bridge-title">
      <header className="deck-heading">
        <small>МОСТИК · ГЛАВА 1</small>
        <h1 id="bridge-title">{sectorNames[sector]}</h1>
        <p>
          Пройдено {completedInSector} из {order.length} миссий. Одна миссия в день — хороший темп;
          больше — твой выбор.
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
            <b>KORA:</b> Первый спутник снова в строю — палуба навигации проснулась. Внизу появилась
            «Карта навыков»: там видно, что уже доказано делом.
          </p>
        </motion.div>
      )}

      {recommended ? (
        <article className="mission-card recommended-card">
          <header>
            <span>МИССИЯ НА СЕГОДНЯ</span>
            <small>≈ {recommended.durationMinutes} мин</small>
          </header>
          <h2>
            {recommended.title}
            <small className="mission-code"> · {recommended.satelliteId}</small>
          </h2>
          <p>{recommended.why}</p>
          <button type="button" className="prologue-action" onClick={() => onStartMission(recommended.id)}>
            {missionAvailability(profile, recommended.id, today) === "review" ? "Освежить" : "Играть"}
          </button>
        </article>
      ) : (
        <article className="mission-card">
          <h2>Глава пройдена</h2>
          <p>
            Все миссии курса пройдены, повторения ещё не созрели. Можно сменить курс или вернуться
            позже.
          </p>
        </article>
      )}

      <details className="mission-details">
        <summary>Все миссии главы</summary>
        <div className="mission-list">
          {order.map((missionId) => {
            const mission = missionsById[missionId];
            if (!mission) return null;
            const availability = missionAvailability(profile, missionId, today);
            return (
              <button
                key={missionId}
                type="button"
                className={`mission-row status-${availability}`}
                onClick={() => onStartMission(missionId)}
              >
                <b>{mission.satelliteId}</b>
                <span>{mission.title}</span>
                <small>{availabilityLabels[availability]}</small>
              </button>
            );
          })}
        </div>
      </details>

      <button type="button" className="sector-switch" onClick={() => onSwitchSector(otherSector)}>
        Сменить курс: «{sectorNames[otherSector]}» — прогресс хранится отдельно
      </button>
    </section>
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
