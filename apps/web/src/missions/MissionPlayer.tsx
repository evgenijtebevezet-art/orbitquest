import { useEffect, useReducer, useRef, useState } from "react";
import type { AttemptRecord, Mission, MissionTask } from "@orbitquest/contracts";
import {
  engineReducer,
  initialEngineState,
  type EngineEvent,
  type EngineState,
} from "./engine";
import { askKora } from "../kora/askKora";

interface MissionPlayerProps {
  mission: Mission;
  onExit: () => void;
  onComplete: (attempts: AttemptRecord[]) => void;
}

export function MissionPlayer({ mission, onExit, onComplete }: MissionPlayerProps) {
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
    <div className="mission-player">
      <header className="mission-player-head">
        <div>
          <small>
            {mission.code} · {mission.satelliteId}
          </small>
          <b>{mission.title}</b>
        </div>
        <button type="button" className="exit-button" onClick={onExit} aria-label="Выйти из миссии">
          ✕
        </button>
      </header>
      {state.phase === "briefing" && <Briefing mission={mission} onBegin={() => dispatch({ type: "begin" })} />}
      {state.phase === "task" && <TaskPhase mission={mission} state={state} dispatch={dispatch} />}
      {state.phase === "result" && <ResultPhase mission={mission} state={state} onExit={onExit} />}
    </div>
  );
}

function Briefing({ mission, onBegin }: { mission: Mission; onBegin: () => void }) {
  return (
    <section className="mission-phase">
      <p className="mission-why">{mission.why}</p>
      <div className="kora-brief">
        <span className="prologue-speaker speaker-kora">KORA</span>
        {mission.briefing.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <AskKoraPanel mission={mission} taskId={null} hintStage={0} enabled />
      <button type="button" className="prologue-action" onClick={onBegin}>
        Начать миссию · {mission.tasks.length} заданий
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
  if (!task) return null;
  const showFeedback = state.taskStatus !== "answering";

  return (
    <section className="mission-phase">
      <header className="task-progress">
        <small>
          Задание {state.taskIndex + 1} из {mission.tasks.length}
          {task.proof ? " · доказательство" : ""}
        </small>
      </header>
      <h1>{task.prompt}</h1>
      {task.type === "order-steps" ? (
        <OrderTask key={task.id} task={task} disabled={showFeedback} onSubmit={(key) => dispatch({ type: "answer", key })} />
      ) : task.type === "find-error-line" ? (
        <FindLineTask key={task.id} task={task} disabled={showFeedback} onSubmit={(key) => dispatch({ type: "answer", key })} />
      ) : (
        <ChoiceTask key={task.id} task={task} disabled={showFeedback} onSubmit={(key) => dispatch({ type: "answer", key })} />
      )}
      {state.taskStatus === "wrong" && (
        <div className="feedback-block">
          <div className="pix-note">
            <b>PIX</b>
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
        </div>
      )}
      {state.taskStatus === "resolved" && (
        <div className="feedback-block">
          <div className={state.resolvedCorrect ? "verdict pass" : "verdict fail"}>
            {state.resolvedCorrect ? "✓ Верно" : "Попытки закончились — разбор ниже"}
          </div>
          <div className="kora-hint">
            <b>KORA · разбор</b>
            <p>{task.explain}</p>
          </div>
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
        {(task.options ?? []).map((option) => (
          <button
            key={option.id}
            type="button"
            className="option"
            disabled={disabled}
            onClick={() => onSubmit(option.id)}
          >
            {option.label}
          </button>
        ))}
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
  state,
  onExit,
}: {
  mission: Mission;
  state: EngineState;
  onExit: () => void;
}) {
  const cleanTasks = mission.tasks.filter((task) =>
    state.attempts.some((a) => a.taskId === task.id && a.correct && a.hintStage === 0),
  ).length;
  return (
    <section className="mission-phase">
      <div className="verdict pass">Миссия {mission.code} завершена</div>
      <p>
        Чисто решено заданий: {cleanTasks} из {mission.tasks.length}. Спутник {mission.satelliteId}{" "}
        отвечает; состояние навыка на карте Atlas обновлено по фактическим доказательствам.
      </p>
      {cleanTasks < mission.tasks.length && (
        <p className="muted-note">
          Задания с подсказками не считаются доказательством навыка — тема вернётся в новой миссии
          в другом контексте.
        </p>
      )}
      <button type="button" className="prologue-action" onClick={onExit}>
        На Мостик
      </button>
    </section>
  );
}

export function taskFirstAttemptMade(state: EngineState, task: MissionTask): boolean {
  return state.attempts.some((a) => a.taskId === task.id);
}
