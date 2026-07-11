import { useEffect, useReducer, useRef, useState } from "react";
import { motion } from "motion/react";
import type { AttemptRecord, CrewLine, Mission, MissionTask } from "@orbitquest/contracts";
import {
  engineReducer,
  initialEngineState,
  type EngineEvent,
  type EngineState,
} from "./engine";
import { askKora } from "../kora/askKora";
import { characterArt } from "../content/loader";

function Portrait({ who }: { who: "kora" | "pix" | "vega" }) {
  const src = characterArt[who];
  if (!src) return null;
  return (
    <motion.img
      className="dialog-portrait sm"
      src={src}
      alt={who.toUpperCase()}
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 18 }}
    />
  );
}

function SfxBurst({ text, tone }: { text: string; tone: "amber" | "acid" }) {
  return (
    <motion.span
      className={`sfx sfx-${tone}`}
      initial={{ scale: 0, rotate: -14, opacity: 0 }}
      animate={{ scale: [0, 1.3, 1], rotate: [-14, 5, -3], opacity: 1 }}
      transition={{ duration: 0.45, times: [0, 0.7, 1] }}
      aria-hidden="true"
    >
      {text}
    </motion.span>
  );
}

function Interlude({ lines }: { lines: CrewLine[] }) {
  return (
    <div className="interlude-block">
      {lines.map((line, index) => (
        <motion.div
          key={`${line.speaker}-${index}`}
          className="interlude-line"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 + index * 0.35 }}
        >
          <div className="speaker-row">
            <Portrait who={line.speaker.toLowerCase() as "kora" | "pix" | "vega"} />
            <b className={`interlude-speaker speaker-${line.speaker.toLowerCase()}`}>{line.speaker}</b>
          </div>
          <p>{line.text}</p>
        </motion.div>
      ))}
    </div>
  );
}

interface MissionPlayerProps {
  mission: Mission;
  emergency?: boolean;
  onExit: () => void;
  onComplete: (attempts: AttemptRecord[]) => void;
}

export function MissionPlayer({ mission, emergency = false, onExit, onComplete }: MissionPlayerProps) {
  const [state, dispatch] = useReducer(
    (s: EngineState, e: EngineEvent) => engineReducer(s, e, mission, () => new Date().toISOString()),
    undefined,
    initialEngineState,
  );
  const completedRef = useRef(false);

  useEffect(() => {
    if (state.phase === "result" && !completedRef.current) {
      completedRef.current = true;
      onComplete(state.attempts);
    }
  }, [state.phase, state.attempts, onComplete]);

  return (
    <div className={emergency ? "mission-player emergency" : "mission-player"}>
      <header className={emergency ? "mission-player-head alert-head" : "mission-player-head"}>
        <div>
          <small>
            {emergency && <span className="alert-tag">⚠ ТРЕВОГА</span>}
            {mission.code} · {mission.satelliteId}
          </small>
          <b>{mission.title}</b>
        </div>
        <button type="button" className="exit-button" onClick={onExit} aria-label="Выйти из миссии">
          ✕
        </button>
      </header>
      {state.phase === "briefing" && (
        <Briefing mission={mission} emergency={emergency} onBegin={() => dispatch({ type: "begin" })} />
      )}
      {state.phase === "task" && <TaskPhase mission={mission} state={state} dispatch={dispatch} />}
      {state.phase === "result" && (
        <ResultPhase mission={mission} emergency={emergency} state={state} onExit={onExit} />
      )}
    </div>
  );
}

function Briefing({
  mission,
  emergency,
  onBegin,
}: {
  mission: Mission;
  emergency: boolean;
  onBegin: () => void;
}) {
  const requiredCount = mission.tasks.filter((task) => !task.bonus).length;
  return (
    <section className="mission-phase">
      <p className="mission-why">{mission.why}</p>
      <div className={emergency ? "kora-brief alert-brief" : "kora-brief"}>
        <div className="speaker-row">
          <Portrait who={emergency ? "pix" : "kora"} />
          <span className={emergency ? "prologue-speaker speaker-pix" : "prologue-speaker speaker-kora"}>
            {emergency ? "PIX · ТРЕВОГА" : "KORA"}
          </span>
        </div>
        {mission.briefing.map((line, index) => (
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.3 }}
          >
            {line}
          </motion.p>
        ))}
      </div>
      <AskKoraPanel mission={mission} taskId={null} hintStage={0} enabled />
      <button type="button" className="prologue-action" onClick={onBegin}>
        {emergency ? "К ремонту" : "Начать миссию"} · {requiredCount} заданий
      </button>
    </section>
  );
}

interface AskKoraPanelProps {
  mission: Mission;
  taskId: string | null;
  hintStage: 0 | 1 | 2 | 3;
  enabled: boolean;
}

function AskKoraPanel({ mission, taskId, hintStage, enabled }: AskKoraPanelProps) {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [reply, setReply] = useState<{ text: string; live: boolean } | null>(null);

  async function submit() {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setReply(null);
    const result = await askKora({ missionId: mission.id, taskId, hintStage, question: trimmed });
    setReply(
      result.live
        ? { text: result.text, live: true }
        : { text: mission.koraFallback, live: false },
    );
    setPending(false);
  }

  if (!enabled) return null; // UI-gate: до первой содержательной попытки KORA не зовётся

  return (
    <div className="ask-kora">
      <div className="ask-kora-row">
        <input
          type="text"
          value={question}
          maxLength={600}
          placeholder="Спросить KORA своими словами…"
          aria-label="Вопрос KORA"
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
        <button type="button" disabled={pending || !question.trim()} onClick={() => void submit()}>
          {pending ? "…" : "Спросить"}
        </button>
      </div>
      {pending && <p className="kora-thinking">KORA думает…</p>}
      {reply && (
        <div className="kora-hint">
          <b>{reply.live ? "KORA" : "Бортовая справка · KORA офлайн"}</b>
          <p>{reply.text}</p>
        </div>
      )}
    </div>
  );
}

interface TaskPhaseProps {
  mission: Mission;
  state: EngineState;
  dispatch: (event: EngineEvent) => void;
}

function TaskPhase({ mission, state, dispatch }: TaskPhaseProps) {
  const task = mission.tasks[state.taskIndex];
  const [bonusAccepted, setBonusAccepted] = useState(false);
  useEffect(() => setBonusAccepted(false), [task?.id]);
  if (!task) return null;
  const showFeedback = state.taskStatus !== "answering";
  const requiredCount = mission.tasks.filter((t) => !t.bonus).length;

  // бонус-оффер: испытание KORA можно принять или завершить миссию без него
  if (task.bonus && !bonusAccepted && state.taskStatus === "answering" && !taskFirstAttemptMade(state, task)) {
    return (
      <section className="mission-phase bonus-offer">
        <div className="speaker-row">
          <Portrait who="kora" />
          <span className="prologue-speaker speaker-kora">KORA</span>
        </div>
        <h1>Испытание KORA</h1>
        <p>
          Обязательная программа выполнена. Есть дополнительное задание — та же тема, но злее:
          граничный случай, на котором ловят даже уверенных. Чистое решение без подсказок отметит
          навык как «владеешь».
        </p>
        <button type="button" className="prologue-action" onClick={() => setBonusAccepted(true)}>
          Принять испытание
        </button>
        <button type="button" className="option" onClick={() => dispatch({ type: "skip-bonus" })}>
          Завершить миссию
        </button>
      </section>
    );
  }

  return (
    <section className="mission-phase">
      <header className="task-progress">
        <small>
          {task.bonus
            ? "Испытание KORA · бонус"
            : `Задание ${state.taskIndex + 1} из ${requiredCount}${task.proof ? " · доказательство" : ""}`}
        </small>
      </header>
      <h1>{task.prompt}</h1>
      {task.type === "order-steps" ? (
        <OrderTask key={task.id} task={task} disabled={showFeedback} onSubmit={(key) => dispatch({ type: "answer", key })} />
      ) : task.type === "find-error-line" ? (
        <FindLineTask key={task.id} task={task} disabled={showFeedback} onSubmit={(key) => dispatch({ type: "answer", key })} />
      ) : task.type === "predict-output-write" ? (
        <WriteTask key={task.id} task={task} disabled={showFeedback} onSubmit={(key) => dispatch({ type: "answer", key })} />
      ) : (
        <ChoiceTask key={task.id} task={task} disabled={showFeedback} onSubmit={(key) => dispatch({ type: "answer", key })} />
      )}
      {state.taskStatus === "wrong" && (
        <motion.div
          key={`wrong-${state.attempts.length}`}
          className="feedback-block"
          initial={{ x: 0 }}
          animate={{ x: [0, -9, 9, -6, 6, 0] }}
          transition={{ duration: 0.4 }}
        >
          <div className="pix-note">
            <SfxBurst text="БИП-БИП!" tone="amber" />
            <div className="speaker-row">
              <Portrait who="pix" />
              <b>PIX</b>
            </div>
            <p>{task.redTest}</p>
          </div>
          <div className="kora-hint">
            <b>KORA · подсказка {state.hintStage}/3</b>
            <p>{task.hints[state.hintStage - 1]}</p>
          </div>
          <AskKoraPanel
            mission={mission}
            taskId={task.id}
            hintStage={state.hintStage}
            enabled={taskFirstAttemptMade(state, task)}
          />
          <button type="button" className="prologue-action" onClick={() => dispatch({ type: "retry" })}>
            Попробовать ещё раз · осталось {state.attemptsLeft}
          </button>
        </motion.div>
      )}
      {state.taskStatus === "resolved" && (
        <div className="feedback-block">
          <motion.div
            className={state.resolvedCorrect ? "verdict pass" : "verdict fail"}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 16 }}
          >
            {state.resolvedCorrect && <SfxBurst text="ОК!" tone="acid" />}
            {state.resolvedCorrect ? "✓ Верно" : "Попытки закончились — разбор ниже"}
          </motion.div>
          <div className="kora-hint">
            <div className="speaker-row">
              <Portrait who="kora" />
              <b>KORA · разбор</b>
            </div>
            <p>{task.explain}</p>
          </div>
          {task.interlude && <Interlude lines={task.interlude} />}
          <button type="button" className="prologue-action" onClick={() => dispatch({ type: "next" })}>
            {state.taskIndex + 1 >= mission.tasks.length ? "К результату" : "Дальше"}
          </button>
        </div>
      )}
    </section>
  );
}

function ChoiceTask({
  task,
  disabled,
  onSubmit,
}: {
  task: MissionTask;
  disabled: boolean;
  onSubmit: (key: string) => void;
}) {
  return (
    <>
      {task.code && (
        <pre className="code-block">
          <code>{task.code}</code>
        </pre>
      )}
      {task.codeB && (
        <>
          <small className="diff-label">Вторая версия:</small>
          <pre className="code-block">
            <code>{task.codeB}</code>
          </pre>
        </>
      )}
      <div className="option-list">
        {(task.options ?? []).map((option, index) => (
          <motion.button
            key={option.id}
            type="button"
            className="option"
            disabled={disabled}
            onClick={() => onSubmit(option.id)}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.25 }}
          >
            {option.label}
          </motion.button>
        ))}
      </div>
    </>
  );
}

function WriteTask({
  task,
  disabled,
  onSubmit,
}: {
  task: MissionTask;
  disabled: boolean;
  onSubmit: (key: string) => void;
}) {
  const [value, setValue] = useState("");
  const numeric = /^-?\d+(?:[.,]\d+)?$/.test(task.answer.trim());

  function submit() {
    if (disabled || !value.trim()) return;
    onSubmit(value);
  }

  return (
    <>
      {task.code && (
        <pre className="code-block">
          <code>{task.code}</code>
        </pre>
      )}
      <div className="write-task">
        <input
          type="text"
          value={value}
          inputMode={numeric ? "numeric" : "text"}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Точный вывод программы…"
          aria-label="Твой ответ"
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
        <button type="button" className="prologue-action" disabled={disabled || !value.trim()} onClick={submit}>
          Проверить
        </button>
      </div>
    </>
  );
}

function OrderTask({
  task,
  disabled,
  onSubmit,
}: {
  task: MissionTask;
  disabled: boolean;
  onSubmit: (key: string) => void;
}) {
  const [order, setOrder] = useState<number[]>(task.initialOrder ?? []);
  const lines = task.lines ?? [];

  function move(position: number, delta: number) {
    const target = position + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[position], next[target]] = [next[target]!, next[position]!];
    setOrder(next);
  }

  return (
    <>
      <ol className="order-list">
        {order.map((lineIndex, position) => (
          <li key={lineIndex}>
            <pre className="order-line">
              <code>{lines[lineIndex]}</code>
            </pre>
            <div className="order-controls">
              <button
                type="button"
                aria-label="Выше"
                disabled={disabled || position === 0}
                onClick={() => move(position, -1)}
              >
                ▲
              </button>
              <button
                type="button"
                aria-label="Ниже"
                disabled={disabled || position === order.length - 1}
                onClick={() => move(position, 1)}
              >
                ▼
              </button>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="prologue-action"
        disabled={disabled}
        onClick={() => onSubmit(order.join(","))}
      >
        Проверить порядок
      </button>
    </>
  );
}

function FindLineTask({
  task,
  disabled,
  onSubmit,
}: {
  task: MissionTask;
  disabled: boolean;
  onSubmit: (key: string) => void;
}) {
  const lines = (task.code ?? "").split("\n");
  return (
    <div className="find-line-list">
      {lines.map((line, index) => (
        <button
          key={`${index}-${line}`}
          type="button"
          className="find-line"
          disabled={disabled}
          onClick={() => onSubmit(String(index + 1))}
        >
          <span className="line-no">{index + 1}</span>
          <pre>
            <code>{line || " "}</code>
          </pre>
        </button>
      ))}
    </div>
  );
}

function ResultPhase({
  mission,
  emergency,
  state,
  onExit,
}: {
  mission: Mission;
  emergency: boolean;
  state: EngineState;
  onExit: () => void;
}) {
  const required = mission.tasks.filter((task) => !task.bonus);
  const cleanTasks = required.filter((task) =>
    state.attempts.some((a) => a.taskId === task.id && a.correct && a.hintStage === 0),
  ).length;
  const bonusTask = mission.tasks.find((task) => task.bonus);
  const bonusClean = Boolean(
    bonusTask &&
      state.attempts.some((a) => a.taskId === bonusTask.id && a.correct && a.hintStage === 0),
  );
  return (
    <section className="mission-phase">
      <motion.div
        className="verdict pass result-verdict"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
      >
        <SfxBurst text={emergency ? "СИСТЕМА В НОРМЕ!" : "СПУТНИК ОНЛАЙН!"} tone="acid" />
        {emergency ? `Авария ${mission.code} устранена` : `Миссия ${mission.code} завершена`}
      </motion.div>
      <p>
        Чисто решено заданий: {cleanTasks} из {required.length}.{" "}
        {emergency
          ? "Система корабля снова в строю; карта навыков обновлена по фактическим доказательствам."
          : `Спутник ${mission.satelliteId} отвечает; состояние навыка на карте обновлено по фактическим доказательствам.`}
      </p>
      {bonusClean && (
        <p className="bonus-note">
          Испытание KORA решено чисто — перенос навыка доказан, отметка «владеешь».
        </p>
      )}
      {cleanTasks < required.length && (
        <p className="muted-note">
          Задания с подсказками не считаются доказательством навыка — тема вернётся в новой миссии
          в другом контексте.
        </p>
      )}
      <button type="button" className="prologue-action" onClick={onExit}>
        К карте
      </button>
    </section>
  );
}

export function taskFirstAttemptMade(state: EngineState, task: MissionTask): boolean {
  return state.attempts.some((a) => a.taskId === task.id);
}
