import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PrologueScene } from "@orbitquest/contracts";

const speakerPortraitKey: Record<string, string> = { KORA: "kora", PIX: "pix", VEGA: "vega" };

interface PrologueScreenProps {
  scenes: PrologueScene[];
  art: Record<string, string>;
  portraits: Record<string, string>;
  sceneIndex: number;
  onAdvance: (name?: string) => void;
  onSkip: () => void;
  onRestoreFile: (file: File) => void;
}

export function PrologueScreen({
  scenes,
  art,
  portraits,
  sceneIndex,
  onAdvance,
  onSkip,
  onRestoreFile,
}: PrologueScreenProps) {
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const scene = scenes[Math.min(sceneIndex, scenes.length - 1)];
  if (!scene) return null;
  const artUrl = art[scene.art];
  const portrait = portraits[speakerPortraitKey[scene.speaker] ?? ""];

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
    <div className="prologue-screen">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={scene.id}
          className="prologue-art"
          style={artUrl ? { backgroundImage: `url(${artUrl})` } : undefined}
          initial={{ opacity: 0, scale: 1.14 }}
          animate={{ opacity: 1, scale: 1.02 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.5 }, scale: { duration: 14, ease: "easeOut" } }}
        />
      </AnimatePresence>
      <div className="prologue-progress" aria-label={`Сцена ${sceneIndex + 1} из ${scenes.length}`}>
        {scenes.map((s, i) => (
          <i key={s.id} className={i < sceneIndex ? "done" : i === sceneIndex ? "active" : ""} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          className="prologue-panel"
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -48 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="speaker-row">
            {portrait && (
              <motion.img
                className="dialog-portrait"
                src={portrait}
                alt={scene.speaker}
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.15 }}
              />
            )}
            <span className={`prologue-speaker speaker-${scene.speaker.toLowerCase()}`}>
              {scene.speaker}
            </span>
          </div>
          <h1>{scene.title}</h1>
          {scene.paragraphs.map((text, index) => (
            <motion.p
              key={text}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + index * 0.35, duration: 0.35 }}
            >
              {text}
            </motion.p>
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
