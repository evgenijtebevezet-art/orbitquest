import type { MissionPhaseId } from "@orbitquest/contracts";

export interface MissionState {
  phase: MissionPhaseId;
  hintsUsed: number;
  simulationPassed: boolean;
}

export type MissionAction =
  | { type: "advance" }
  | { type: "use_hint" }
  | { type: "pass_simulation" }
  | { type: "reset" };

export const initialMissionState: MissionState = {
  phase: "signal",
  hintsUsed: 0,
  simulationPassed: false,
};

const nextPhase: Record<MissionPhaseId, MissionPhaseId> = {
  signal: "briefing",
  briefing: "repair",
  repair: "simulation",
  simulation: "simulation",
  complete: "complete",
};

export function missionReducer(state: MissionState, action: MissionAction): MissionState {
  switch (action.type) {
    case "advance":
      return { ...state, phase: nextPhase[state.phase] };
    case "use_hint":
      return { ...state, hintsUsed: state.hintsUsed + 1 };
    case "pass_simulation":
      return { ...state, phase: "complete", simulationPassed: true };
    case "reset":
      return initialMissionState;
  }
}

export const missionCopy: Record<
  MissionPhaseId,
  { action: string; kora: string; pix: string }
> = {
  signal: {
    action: "Начать калибровку",
    kora: "TOOLS-03 теряет орбиту. Причина — смешение запроса модели и реального разрешения backend.",
    pix: "Инструменты готовы. Ошибки тоже. Я всё предусмотрел.",
  },
  briefing: {
    action: "Изучить схему",
    kora: "Сначала разделим системы: модель выбирает tool, но приложение независимо разрешает действие.",
    pix: "Схему открыл. Ничего не замкнул. Пока.",
  },
  repair: {
    action: "Перейти в ангар",
    kora: "Теперь нужен самостоятельный ремонт: добавь проверку пути и докажи её тестами.",
    pix: "Красный тест уже ждёт. Очень гостеприимно.",
  },
  simulation: {
    action: "Запустить симуляцию",
    kora: "Исправление подготовлено. Детерминированные тесты дадут окончательный verdict.",
    pix: "Ремонтный модуль подключён. Наверное, правильной стороной.",
  },
  complete: {
    action: "Канал восстановлен",
    kora: "TOOLS-03 вернулся на орбиту. Навык подтверждён и позже появится в другом контексте.",
    pix: "Зелёный свет! Согласно журналу, именно так я и планировал.",
  },
};
