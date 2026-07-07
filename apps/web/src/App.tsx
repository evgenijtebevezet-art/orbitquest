import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import type { BootstrapResponse, DeckId, MissionPhaseId } from "@orbitquest/contracts";
import { loadBootstrap, offlineBootstrap } from "./data/bootstrap";
import {
  initialMissionState,
  missionCopy,
  missionReducer,
  type MissionState,
} from "./domain/mission";

const decks: Array<{ id: DeckId; icon: string; label: string }> = [
  { id: "bridge", icon: "⌂", label: "Мостик" },
  { id: "atlas", icon: "✦", label: "Atlas" },
  { id: "radar", icon: "⌁", label: "Радар" },
  { id: "hangar", icon: "⌗", label: "Ангар" },
];

const missionPhases: MissionPhaseId[] = ["signal", "briefing", "repair", "simulation"];

function restoreMissionState(): MissionState {
  try {
    const stored = localStorage.getItem("orbitquest:mission");
    if (!stored) return initialMissionState;
    const parsed = JSON.parse(stored) as Partial<MissionState>;
    if (!parsed.phase || ![...missionPhases, "complete"].includes(parsed.phase)) {
      return initialMissionState;
    }
    return {
      phase: parsed.phase,
      hintsUsed: Number(parsed.hintsUsed ?? 0),
      simulationPassed: Boolean(parsed.simulationPassed),
    };
  } catch {
    return initialMissionState;
  }
}

export function App() {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse>(offlineBootstrap);
  const [connection, setConnection] = useState<"loading" | "online" | "offline">("loading");
  const [activeDeck, setActiveDeck] = useState<DeckId>("bridge");
  const [mission, dispatch] = useReducer(missionReducer, undefined, restoreMissionState);
  const [koraOverride, setKoraOverride] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadBootstrap(controller.signal)
      .then((response) => {
        setBootstrap(response);
        setConnection("online");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setConnection("offline");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    localStorage.setItem("orbitquest:mission", JSON.stringify(mission));
  }, [mission]);

  const copy = missionCopy[mission.phase];
  const stability = mission.phase === "complete"
    ? Math.min(100, bootstrap.ship.constellationStability + 4)
    : bootstrap.ship.constellationStability;

  function handleMissionAction() {
    setKoraOverride(null);
    if (mission.phase === "repair" || mission.phase === "simulation") {
      if (mission.phase === "repair") dispatch({ type: "advance" });
      setActiveDeck("hangar");
      return;
    }
    if (mission.phase !== "complete") dispatch({ type: "advance" });
  }

  function passSimulation() {
    dispatch({ type: "pass_simulation" });
    window.setTimeout(() => setActiveDeck("bridge"), 520);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setActiveDeck("bridge")}>
          <span className="brand-mark"><i /></span>
          <span><b>ORBIT</b>QUEST</span>
        </button>
        <div className="ship-meta">
          <small>{bootstrap.ship.name} · {bootstrap.ship.registry}</small>
          <strong><i /> ATLAS {bootstrap.ship.atlasConnection === "stable" ? "STABLE" : "DEGRADED"}</strong>
        </div>
        <span className={`connection-pill ${connection}`}>
          {connection === "online" ? "SYNC" : connection === "offline" ? "LOCAL" : "…"}
        </span>
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
            <span>{deck.icon}</span><b>{deck.label}</b><small>0{index + 1}</small>
            {deck.id === "radar" && <i>{bootstrap.unreadSignals}</i>}
          </button>
        ))}
        <div className="navigator-card">
          <span>{bootstrap.navigator.displayName.slice(0, 2).toUpperCase()}</span>
          <div><b>Навигатор {bootstrap.navigator.displayName}</b><small>{bootstrap.navigator.rank}</small></div>
        </div>
      </aside>

      <main className="main-viewport">
        {activeDeck === "bridge" && (
          <Bridge
            data={bootstrap}
            mission={mission}
            stability={stability}
            koraMessage={koraOverride ?? copy.kora}
            pixMessage={copy.pix}
            onAction={handleMissionAction}
            onOpenRadar={() => setActiveDeck("radar")}
            onAskKora={setKoraOverride}
          />
        )}
        {activeDeck === "atlas" && <Atlas mission={mission} />}
        {activeDeck === "radar" && <Radar onAccept={() => setActiveDeck("bridge")} />}
        {activeDeck === "hangar" && (
          <Hangar
            mission={mission}
            onUseHint={() => dispatch({ type: "use_hint" })}
            onPass={passSimulation}
          />
        )}
      </main>

      <nav className="mobile-dock" aria-label="Основная навигация">
        {decks.map((deck) => (
          <button
            key={deck.id}
            type="button"
            className={activeDeck === deck.id ? "active" : ""}
            onClick={() => setActiveDeck(deck.id)}
          >
            <span>{deck.icon}</span><small>{deck.label}</small>
            {deck.id === "radar" && <i>{bootstrap.unreadSignals}</i>}
          </button>
        ))}
      </nav>
    </div>
  );
}

interface BridgeProps {
  data: BootstrapResponse;
  mission: MissionState;
  stability: number;
  koraMessage: string;
  pixMessage: string;
  onAction: () => void;
  onOpenRadar: () => void;
  onAskKora: (message: string) => void;
}

function Bridge({
  data,
  mission,
  stability,
  koraMessage,
  pixMessage,
  onAction,
  onOpenRadar,
  onAskKora,
}: BridgeProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const phaseIndex = mission.phase === "complete" ? 4 : missionPhases.indexOf(mission.phase);
  const copy = missionCopy[mission.phase];

  function moveScene(event: PointerEvent<HTMLDivElement>) {
    const node = sceneRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    node.style.setProperty("--pointer-x", x.toFixed(3));
    node.style.setProperty("--pointer-y", y.toFixed(3));
  }

  return (
    <section className="deck-view bridge-view" aria-labelledby="bridge-title">
      <div
        ref={sceneRef}
        className={`space-window ${mission.phase === "complete" ? "stabilized" : ""}`}
        onPointerMove={moveScene}
        onPointerLeave={() => {
          sceneRef.current?.style.setProperty("--pointer-x", "0");
          sceneRef.current?.style.setProperty("--pointer-y", "0");
        }}
      >
        <div className="stars far" /><div className="stars near" />
        <div className="aurora" /><div className="horizon" />
        <span className="sector-tag">ATLAS / AGENT SYSTEMS</span>
        <button className="vega-signal" type="button" onClick={onOpenRadar}>
          <span>V</span>
          <div><small>VEGA · VERIFIED</small><b>Изменение в секторе Tools</b></div>
          <i>→</i>
        </button>
        <div className="orbit orbit-a" /><div className="orbit orbit-b" />
        <button className="satellite" type="button" aria-label={`${data.activeMission.satelliteId}: текущая миссия`} onClick={onAction}>
          <span className="solar left" /><span className="satellite-body"><i /></span><span className="solar right" />
          <b>{data.activeMission.satelliteId}</b>
          <small>{mission.phase === "complete" ? "ОРБИТА СТАБИЛЬНА" : "СДВИГ ОРБИТЫ"}</small>
        </button>
        <div className="kora-unit">
          <div className="kora-orb" aria-hidden="true"><i /><i /><i /><b /></div>
          <div className="speech-panel">
            <header><b>KORA</b><small>КОГНИТИВНЫЙ НАВИГАТОР</small></header>
            <p>{koraMessage}</p>
            <div>
              <button type="button" onClick={() => onAskKora("Найди границу доверия: модель предлагает действие, но backend обязан независимо проверить permission, путь и роль.")}>Цель</button>
              <button type="button" onClick={() => onAskKora("Описание tool влияет только на выбор модели. Permission контролирует реальные последствия вызова.")}>Почему?</button>
            </div>
          </div>
        </div>
        <div className="pix-unit"><span className="pix-body"><i>••</i></span><p><b>PIX</b>{pixMessage}</p></div>
      </div>

      <article className="mission-console">
        <header><span>МИССИЯ {data.activeMission.code} · КАЛИБРОВКА</span><span>≈ {data.activeMission.durationMinutes} МИН</span></header>
        <div className="mission-summary">
          <span className="mission-glyph">⌬</span>
          <div><small>{data.activeMission.sector}</small><h1 id="bridge-title">{data.activeMission.title}</h1><p>{data.activeMission.objective}</p></div>
          <button type="button" onClick={onAction} disabled={mission.phase === "complete"}>{copy.action}<i>→</i></button>
        </div>
        <div className="route" aria-label="Прогресс миссии">
          {missionPhases.map((phase, index) => (
            <div key={phase} className={index < phaseIndex ? "done" : index === phaseIndex ? "active" : ""}>
              <i>{index < phaseIndex ? "✓" : `0${index + 1}`}</i><span>{["Сигнал", "Схема", "Ремонт", "Симуляция"][index]}</span>
            </div>
          ))}
        </div>
      </article>

      <div className="status-strip">
        <div><small>СТАБИЛЬНОСТЬ</small><strong>{stability}%</strong><span><i style={{ width: `${stability}%` }} /></span></div>
        <div><small>ВОССТАНОВЛЕНО</small><strong>{data.ship.restoredSatellites}</strong><span>спутника</span></div>
        <div className="warning"><small>ТРЕБУЮТ ВНИМАНИЯ</small><strong>0{data.ship.attentionChannels}</strong><span>канала</span></div>
      </div>
    </section>
  );
}

function Atlas({ mission }: { mission: MissionState }) {
  const [selected, setSelected] = useState("Permissions");
  const nodes = useMemo(() => [
    { name: "Context", state: "stable", x: 18, y: 65 },
    { name: "Tools", state: mission.phase === "complete" ? "stable" : "drifting", x: 42, y: 35 },
    { name: "Permissions", state: "current", x: 60, y: 62 },
    { name: "MCP", state: "drifting", x: 80, y: 30 },
  ], [mission.phase]);

  return (
    <section className="deck-view atlas-view">
      <DeckHeading eyebrow="НАВИГАЦИОННАЯ ПАЛУБА" title="Созвездие Atlas" copy="Коснись спутника, чтобы проверить состояние навыка и доступный маршрут." />
      <div className="atlas-map">
        <div className="map-cloud" /><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M18 65 C28 18 40 24 42 35 S50 78 60 62 S70 18 80 30" /></svg>
        {nodes.map((node) => (
          <button
            key={node.name}
            type="button"
            className={`skill-node ${node.state} ${selected === node.name ? "selected" : ""}`}
            style={{ "--x": `${node.x}%`, "--y": `${node.y}%` } as CSSProperties}
            onClick={() => setSelected(node.name)}
          ><i /><b>{node.name}</b><small>{node.state}</small></button>
        ))}
        <div className="map-caption"><span className="mini-kora" /><p><b>KORA:</b> {selected} — выбранный сектор. Следующая миссия будет объяснима через этот маршрут.</p></div>
      </div>
    </section>
  );
}

function Radar({ onAccept }: { onAccept: () => void }) {
  return (
    <section className="deck-view radar-view">
      <DeckHeading eyebrow="ДАЛЬНЯЯ СВЯЗЬ" title="Радар сигналов" copy="VEGA отделяет подтверждённые изменения от шума и маркетинговых заявлений." />
      <div className="radar-visual"><i /><i /><i /><span /></div>
      <div className="signal-list">
        <article className="critical"><header><span>ДЕЙСТВИЕ НУЖНО</span><small>СЕГОДНЯ</small></header><h2>Сектор Tools потерял синхронизацию</h2><p>Официальное изменение затрагивает два освоенных навыка.</p><footer><b>TIER A · VERIFIED</b><button type="button" onClick={onAccept}>Принять →</button></footer></article>
        <article><header><span>ПОДТВЕРЖДЕНО</span><small>ВЧЕРА</small></header><h2>Новый стабильный релиз</h2><p>Полезно для будущей экспедиции, переобучение пока не требуется.</p><footer><b>OFFICIAL RELEASE</b><button type="button">В архив</button></footer></article>
        <article className="muted"><header><span>ШУМ ОТФИЛЬТРОВАН</span><small>2 ДНЯ</small></header><h2>«Революционный» AI-инструмент</h2><p>Нет первичного источника и воспроизводимого результата.</p><footer><b>UNVERIFIED</b><button type="button">Почему?</button></footer></article>
      </div>
    </section>
  );
}

function Hangar({ mission, onUseHint, onPass }: { mission: MissionState; onUseHint: () => void; onPass: () => void }) {
  const hints = [
    "Что произойдёт, если path начинается с ../ и resolve построит путь выше WORKSPACE?",
    "После resolve итоговый путь обязан остаться внутри доверенного корня.",
    "Сравни requested с root и root + системный разделитель пути.",
  ];
  const [hintLevel, setHintLevel] = useState(0);
  const [code, setCode] = useState("const requested = resolve(WORKSPACE, path);\n\n// TODO: verify requested path\n\nreturn readFile(requested, 'utf8');");

  function revealHint() {
    setHintLevel((level) => Math.min(hints.length, level + 1));
    onUseHint();
  }

  return (
    <section className="deck-view hangar-view">
      <DeckHeading eyebrow="РЕМОНТНАЯ ПАЛУБА" title="Ангар PIX" copy="Исправь границу доверия. В первом инкременте симулятор детерминирован и не исполняет код." />
      <div className="repair-module"><div className="module-object"><i /><b>TOOLS-03</b><small>PERMISSION CORE</small></div><div><h2>Модуль разрешений</h2><p>Не дай относительному пути выйти за границы рабочего каталога.</p><span>□ проверить root</span><span>□ отклонить traversal</span><span>□ пройти tests</span></div></div>
      <div className="code-panel">
        <header><span>tool-handler.ts</span><b>● SIM LOCAL</b></header>
        <textarea aria-label="Код ремонта" value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} />
        <div className="sim-output"><span>SIMULATOR</span><p className={mission.simulationPassed ? "pass" : "fail"}>{mission.simulationPassed ? "✓ 2 tests passed" : "✕ rejects path outside workspace"}</p></div>
      </div>
      <aside className="hint-panel"><div className="pix-face">••</div><small>PIX / DIAGNOSTICS</small><p>{hintLevel ? hints[hintLevel - 1] : "Первый тест красный. Я дам направление, но решение сначала твоё."}</p><button type="button" onClick={revealHint} disabled={hintLevel === hints.length}>Подсказка {Math.min(hintLevel + 1, hints.length)}/3</button><button className="run-button" type="button" onClick={onPass} disabled={mission.simulationPassed}>{mission.simulationPassed ? "Стабилизировано ✓" : "Запустить симуляцию"}</button></aside>
    </section>
  );
}

function DeckHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="deck-heading"><small>{eyebrow}</small><h1>{title}</h1><p>{copy}</p></header>;
}
