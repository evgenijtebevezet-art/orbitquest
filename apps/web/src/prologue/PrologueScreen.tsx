import { useRef, useState } from "react";
import type { PrologueScene } from "@orbitquest/contracts";

interface PrologueScreenProps {
  scenes: PrologueScene[];
  art: Record<string, string>;
  sceneIndex: number;
  onAdvance: (name?: string) => void;
  onSkip: () => void;
  onRestoreFile: (file: File) => void;
}

export function PrologueScreen({
  scenes,
  art,
  sceneIndex,
  onAdvance,
  onSkip,
  onRestoreFile,
}: PrologueScreenProps) {
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const scene = scenes[Math.min(sceneIndex, scenes.length - 1)];
  if (!scene) return null;
  const backgroundImage = art[scene.art] ? `url(${art[scene.art]})` : undefined;

  function handleAdvance() {
    onAdvance(scene!.nameInput ? name : undefined);
    setName("");
  }

  function handleSkip() {
    if (window.confirm("Пропустить пролог? Знакомство с экипажем останется в разделе «Экипаж».")) {
      onSkip();
    }
  }

  return (
    <div className="prologue-screen" style={{ backgroundImage }}>
      <div className="prologue-progress" aria-label={`Сцена ${sceneIndex + 1} из ${scenes.length}`}>
        {scenes.map((s, i) => (
          <i key={s.id} className={i < sceneIndex ? "done" : i === sceneIndex ? "active" : ""} />
        ))}
      </div>
      <div className="prologue-panel">
        <span className={`prologue-speaker speaker-${scene.speaker.toLowerCase()}`}>{scene.speaker}</span>
        <h1>{scene.title}</h1>
        {scene.paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
        {scene.nameInput && (
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Навигатор"
            maxLength={24}
            autoFocus
            aria-label="Имя Навигатора"
          />
        )}
        <button type="button" className="prologue-action" onClick={handleAdvance}>
          {scene.actionLabel}
        </button>
        <button type="button" className="prologue-skip" onClick={handleSkip}>
          Пропустить пролог
        </button>
        {sceneIndex === 0 && (
          <>
            <button
              type="button"
              className="prologue-skip"
              onClick={() => restoreInputRef.current?.click()}
            >
              У меня есть файл прогресса — восстановить
            </button>
            <input
              ref={restoreInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onRestoreFile(file);
                event.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
