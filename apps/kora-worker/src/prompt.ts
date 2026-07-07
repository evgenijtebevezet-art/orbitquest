export interface KoraTaskContext {
  prompt: string;
  code?: string;
  codeB?: string;
}

export interface KoraMissionContext {
  title: string;
  why: string;
  briefing: string[];
  tasks: Record<string, KoraTaskContext>;
}

export type KoraContext = Record<string, KoraMissionContext>;

export interface AskPayload {
  missionId: string;
  taskId: string | null;
  hintStage: 0 | 1 | 2 | 3;
  question: string;
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const hintStageRules: Record<0 | 1 | 2 | 3, string> = {
  0: "Игрок ещё не ошибался: отвечай на вопрос по брифингу, не подсказывай решение задания.",
  1: "Разрешён уровень 1: один наводящий вопрос, без направления и без решения.",
  2: "Разрешён уровень 2: укажи направление, но не решение.",
  3: "Разрешён уровень 3: можно разобрать задание по шагам.",
};

export function buildMessages(context: KoraContext, payload: AskPayload): ChatMessage[] {
  const mission = context[payload.missionId];
  const task = payload.taskId ? mission?.tasks[payload.taskId] : undefined;

  const system = [
    "Ты — KORA, корабельный навигатор обучающей игры OrbitQuest. Игрок — взрослый новичок, учится читать Python-код.",
    "Формула ответа: наблюдение → вопрос → следующий шаг. Отвечай по-русски, не больше 120 слов, без снисходительности и без «молодец».",
    "Жёсткие правила: не выдавай готовое решение задания раньше уровня 3; не выноси вердикт о правильности ответа игрока; честно обозначай неопределённость.",
    `Уровень подсказки: ${payload.hintStage}. ${hintStageRules[payload.hintStage]}`,
  ].join("\n");

  const contextLines: string[] = [];
  if (mission) {
    contextLines.push(`Миссия: ${mission.title}`, mission.why, ...mission.briefing);
  }
  if (task) {
    contextLines.push(`Текущее задание: ${task.prompt}`);
    if (task.code) contextLines.push("Код задания:\n" + task.code);
    if (task.codeB) contextLines.push("Вторая версия кода:\n" + task.codeB);
  }
  contextLines.push(`Вопрос игрока: ${payload.question}`);

  return [
    { role: "system", content: system },
    { role: "user", content: contextLines.join("\n\n") },
  ];
}
