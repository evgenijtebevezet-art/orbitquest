import { useState } from "react";
import type { Capability, Profile, SectorId } from "@orbitquest/contracts";
import { calibrationItems } from "../content/loader";
import { scoreCalibration } from "./scoring";

export const skillNames: Record<string, string> = {
  "code.literal": "Буквальность машины",
  "code.variables": "Переменные и данные",
  "code.order": "Порядок выполнения",
  "code.conditions": "Условия",
  "code.loops": "Циклы",
  "code.read-script": "Чтение скрипта целиком",
  "agent.model-context": "Модель, инструкции, контекст",
  "agent.verification": "Проверка AI-кода",
  "agent.permissions": "Инструменты и разрешения",
};

export const capNames: Record<Capability, string> = {
  unknown: "ещё не изучено",
  recognizes: "узнал идею",
  applies: "умеешь читать",
  transfers: "владеешь",
};

export const sectorNames: Record<SectorId, string> = {
  code: "Основы кода",
  agent: "AI-кодинг",
};

interface CalibrationProps {
  profile: Profile;
  onProfileChange: (updater: (p: Profile) => Profile) => void;
}

export function Calibration({ profile, onProfileChange }: CalibrationProps) {
  if (!profile.calibration.done) {
    return <CalibrationQuiz profile={profile} onProfileChange={onProfileChange} />;
  }
  return <SectorReveal profile={profile} onProfileChange={onProfileChange} />;
}

function CalibrationQuiz({ profile, onProfileChange }: CalibrationProps) {
  const idx = Math.min(profile.calibration.answers.length, calibrationItems.length - 1);
  const item = calibrationItems[idx];
  const [picked, setPicked] = useState<string | null>(null);
  const [confident, setConfident] = useState(false);
  if (!item) return null;

  function submit() {
    if (!picked) return;
    const answer = { itemId: item!.id, choiceId: picked, confident: picked !== "dont-know" && confident };
    onProfileChange((p) => {
      const answers = [...p.calibration.answers, answer];
      const done = answers.length >= calibrationItems.length;
      return {
        ...p,
        calibration: {
          ...p.calibration,
          answers,
          result: done ? scoreCalibration(calibrationItems, answers) : null,
          done,
        },
      };
    });
    setPicked(null);
    setConfident(false);
  }

  return (
    <div className="calibration-screen">
      <header className="calibration-head">
        <span className="prologue-speaker speaker-kora">KORA · КАЛИБРОВКА</span>
        <small>
          Задание {idx + 1} из {calibrationItems.length}
        </small>
      </header>
      <h1>{item.prompt}</h1>
      {item.code && (
        <pre className="code-block">
          <code>{item.code}</code>
        </pre>
      )}
      <div className="option-list">
        {item.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={picked === option.id ? "option selected" : "option"}
            onClick={() => setPicked(option.id)}
          >
            {option.label}
          </button>
        ))}
        <button
          type="button"
          className={picked === "dont-know" ? "option dont-know selected" : "option dont-know"}
          onClick={() => setPicked("dont-know")}
        >
          Не знаю — честный ответ, он тоже калибрует
        </button>
      </div>
      {picked && picked !== "dont-know" && (
        <label className="confident-toggle">
          <input
            type="checkbox"
            checked={confident}
            onChange={(event) => setConfident(event.target.checked)}
          />
          Уверен(а) в ответе
        </label>
      )}
      <button type="button" className="prologue-action" disabled={!picked} onClick={submit}>
        Дальше
      </button>
    </div>
  );
}

function SectorReveal({ profile, onProfileChange }: CalibrationProps) {
  const result = profile.calibration.result;
  if (!result) {
    return null;
  }
  const recommendedLabel = sectorNames[result.recommendedSector];
  const skipCount = result.skipMissionIds.length;

  function chooseSector(sector: SectorId) {
    onProfileChange((p) => ({ ...p, sector }));
  }

  function toggleOverride() {
    onProfileChange((p) => ({
      ...p,
      calibration: { ...p.calibration, skipsOverridden: !p.calibration.skipsOverridden },
    }));
  }

  function redoCalibration() {
    onProfileChange((p) => ({
      ...p,
      calibration: { answers: [], result: null, done: false, skipsOverridden: false },
    }));
  }

  return (
    <div className="calibration-screen">
      <span className="prologue-speaker speaker-kora">KORA · РЕЗУЛЬТАТ</span>
      <h1>Калибровка завершена</h1>
      <p>
        Я вижу карту твоих систем. Что активировать первым? Рекомендую сектор «{recommendedLabel}»
        {result.recommendedSector === "code"
          ? " — базовые системы требуют активации: начнём с того, как машина читает программу."
          : " — базовые системы стабильны: уверенные ответы по коду позволяют начать с AI-кодинга."}
      </p>
      <ul className="skill-map">
        {Object.entries(result.capabilities).map(([skillId, cap]) => (
          <li key={skillId}>
            <b>{skillNames[skillId] ?? skillId}</b>
            <span className={`cap cap-${cap}`}>{capNames[cap]}</span>
          </li>
        ))}
      </ul>
      {skipCount > 0 && (
        <div className="skip-block">
          <p>
            Уверенные верные ответы позволяют пропустить {skipCount}{" "}
            {skipCount === 1 ? "миссию" : skipCount < 5 ? "миссии" : "миссий"} главы 1. Пропущенное
            всегда можно открыть с карты Atlas.
          </p>
          <label className="confident-toggle">
            <input
              type="checkbox"
              checked={profile.calibration.skipsOverridden}
              onChange={toggleOverride}
            />
            Пройти всё подряд, ничего не пропускать
          </label>
        </div>
      )}
      <h2>Выбери сектор</h2>
      <div className="sector-cards">
        {(Object.keys(sectorNames) as SectorId[]).map((sector) => (
          <button key={sector} type="button" className="sector-card" onClick={() => chooseSector(sector)}>
            <b>{sectorNames[sector]}</b>
            <small>
              {sector === "code"
                ? "Python: читать код и предсказывать, что он сделает"
                : "Модель, контекст, проверка и границы разрешений"}
            </small>
            {sector === result.recommendedSector && <span className="recommended">рекомендовано</span>}
          </button>
        ))}
      </div>
      <button type="button" className="prologue-skip" onClick={redoCalibration}>
        Повторить калибровку
      </button>
    </div>
  );
}
