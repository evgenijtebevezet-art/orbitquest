import { useEffect, useState } from "react";
import type { Profile } from "@orbitquest/contracts";
import { importProfile, loadProfile, saveProfile } from "../profile/storage";
import { prologueScenes, prologueArt } from "../content/loader";
import { advanceScene, skipPrologue } from "../prologue/prologue";
import { PrologueScreen } from "../prologue/PrologueScreen";
import { Calibration } from "../diagnostic/Calibration";
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

  function restoreFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = importProfile(String(reader.result));
      if (!parsed.ok) {
        window.alert(parsed.error);
        return;
      }
      if (!window.confirm("Восстановить прогресс из файла? Текущее состояние будет заменено.")) return;
      setProfile(parsed.profile);
    };
    reader.readAsText(file);
  }

  if (stage === "prologue") {
    return (
      <PrologueScreen
        scenes={prologueScenes}
        art={prologueArt}
        sceneIndex={profile.prologueSceneIndex}
        onAdvance={(name?: string) => setProfile((p) => advanceScene(p, prologueScenes.length, name))}
        onSkip={() => setProfile(skipPrologue)}
        onRestoreFile={restoreFromFile}
      />
    );
  }
  if (stage === "calibration" || stage === "sector") {
    return <Calibration profile={profile} onProfileChange={setProfile} />;
  }
  return <App profile={profile} onProfileChange={setProfile} />;
}
