import { useEffect, useState } from "react";
import type { Profile } from "@orbitquest/contracts";
import { loadProfile, saveProfile } from "../profile/storage";
import { prologueScenes, prologueArt } from "../content/loader";
import { advanceScene, skipPrologue } from "../prologue/prologue";
import { PrologueScreen } from "../prologue/PrologueScreen";
import { App } from "../App";

export type GameStage = "prologue" | "calibration" | "sector" | "main";

export function gameStage(profile: Profile): GameStage {
  if (!profile.prologueDone) return "prologue";
  if (!profile.calibration.done) return "calibration";
  if (profile.sector === null) return "sector";
  return "main";
}

export function Root() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  useEffect(() => {
    saveProfile(profile);
  }, [profile]);
  const stage = gameStage(profile);

  if (stage === "prologue") {
    return (
      <PrologueScreen
        scenes={prologueScenes}
        art={prologueArt}
        sceneIndex={profile.prologueSceneIndex}
        onAdvance={(name?: string) => setProfile((p) => advanceScene(p, prologueScenes.length, name))}
        onSkip={() => setProfile(skipPrologue)}
      />
    );
  }
  if (stage === "calibration" || stage === "sector") {
    return <CalibrationStagePlaceholder />; // заменяется калибровкой (Task 9)
  }
  return <App />;
}

function CalibrationStagePlaceholder() {
  return (
    <div className="prologue-screen">
      <div className="prologue-panel">
        <span className="prologue-speaker speaker-kora">KORA</span>
        <h1>Калибровка готовится</h1>
        <p>Диагностические системы прогреваются. Возвращайся со следующим обновлением.</p>
      </div>
    </div>
  );
}
