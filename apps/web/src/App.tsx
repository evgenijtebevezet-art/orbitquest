import { useRef, useState } from "react";
import type { AttemptRecord, Mission, Profile, SectorId } from "@orbitquest/contracts";
import { contentIndex, missionsById } from "./content/loader";
import { applyMissionResult, missionAvailability, recommendMission } from "./missions/engine";
import { MissionPlayer } from "./missions/MissionPlayer";
import { AtlasMap } from "./atlas/AtlasMap";
import { sectorNames } from "./diagnostic/Calibration";
import { exportProfile, importProfile } from "./profile/storage";

type DeckId = "bridge" | "atlas" | "profile";

const decks: Array<{ id: DeckId; icon: string; label: string }> = [
  { id: "bridge", icon: "⌂", label: "Мостик" },
  { id: "atlas", icon: "✦", label: "Atlas" },
  { id: "profile", icon: "⌗", label: "Профиль" },
];

const SHIP = { name: "Odyssey", registry: "NQ-07" };

interface AppProps {
  profile: Profile;
  onProfileChange: (updater: (p: Profile) => Profile) => void;
}

export function App({ profile, onProfileChange }: AppProps) {
  const [activeDeck, setActiveDeck] = useState<DeckId>("bridge");
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);

  const sector: SectorId = profile.sector ?? "code";
  const order = contentIndex.missionOrder[sector];
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
            <i /> СЕКТОР: {sectorNames[sector].toUpperCase()}
          </strong>
        </div>
      </header>

      <aside className="rail" aria-label="Палубы Odyssey">
        <span className="rail-title">ПАЛУБЫ</span>
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
            <small>маршрут: Освоение</small>
          </div>
        </div>
      </aside>

      <main className="main-viewport">
        {activeDeck === "bridge" && (
          <Bridge
            profile={profile}
            sector={sector}
            order={order}
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
    </div>
  );
}

interface BridgeProps {
  profile: Profile;
  sector: SectorId;
  order: string[];
  onStartMission: (missionId: string) => void;
  onSwitchSector: (sector: SectorId) => void;
}

function Bridge({ profile, sector, order, onStartMission, onSwitchSector }: BridgeProps) {
  const today = new Date();
  const recommendedId = recommendMission(profile, order, missionsById, today);
  const recommended = recommendedId ? missionsById[recommendedId] : undefined;
  const completedCount = order.filter(
    (id) => missionAvailability(profile, id, today) === "completed",
  ).length;
  const otherSector: SectorId = sector === "code" ? "agent" : "code";

  return (
    <section className="deck-view bridge-view-v2" aria-labelledby="bridge-title">
      <header className="deck-heading">
        <small>МОСТИК · ГЛАВА 1</small>
        <h1 id="bridge-title">Сектор «{sectorNames[sector]}»</h1>
        <p>
          Завершено {completedCount} из {order.length} миссий. Ритм не давит: одна миссия в день —
          хороший темп, больше — твой выбор.
        </p>
      </header>

      {recommended ? (
        <article className="mission-card recommended-card">
          <header>
            <span>РЕКОМЕНДОВАННАЯ МИССИЯ</span>
            <small>≈ {recommended.durationMinutes} мин</small>
          </header>
          <h2>
            {recommended.satelliteId} · {recommended.title}
          </h2>
          <p>{recommended.why}</p>
          <button type="button" className="prologue-action" onClick={() => onStartMission(recommended.id)}>
            {missionAvailability(profile, recommended.id, today) === "review"
              ? "Повторить в новом заходе"
              : "Принять миссию"}
          </button>
        </article>
      ) : (
        <article className="mission-card">
          <h2>Глава пройдена</h2>
          <p>
            Все миссии сектора завершены, повторения ещё не созрели. Можно переключить сектор или
            вернуться позже.
          </p>
        </article>
      )}

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
              <small>
                {availability === "new" && "доступна"}
                {availability === "skipped" && "пропущена калибровкой"}
                {availability === "completed" && "завершена ✓"}
                {availability === "review" && "пора повторить"}
              </small>
            </button>
          );
        })}
      </div>

      <button type="button" className="sector-switch" onClick={() => onSwitchSector(otherSector)}>
        Переключиться на сектор «{sectorNames[otherSector]}» — прогресс сохраняется раздельно
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
          Прогресс хранится только на этом устройстве (профиль v{profile.profileVersion}, контент{" "}
          {profile.contentVersion}). Экспортируй файл, чтобы не потерять его или перенести.
        </p>
      </header>
      <div className="profile-actions">
        <button type="button" className="prologue-action" onClick={handleExport}>
          Экспортировать прогресс в файл
        </button>
        <button type="button" className="option" onClick={() => fileInputRef.current?.click()}>
          Импортировать из файла (заменит текущий прогресс)
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
