const scenes = [...document.querySelectorAll('.scene')];
const sceneButtons = [...document.querySelectorAll('[data-scene]')];
const deckButtons = [...document.querySelectorAll('.deck-button')];
const mobileButtons = [...document.querySelectorAll('.mobile-dock [data-scene]')];

function showScene(name) {
  scenes.forEach((scene) => scene.classList.toggle('active', scene.id === `scene-${name}`));
  deckButtons.forEach((button) => button.classList.toggle('active', button.dataset.scene === name));
  mobileButtons.forEach((button) => button.classList.toggle('active', button.dataset.scene === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

sceneButtons.forEach((button) => button.addEventListener('click', (event) => {
  if (button.dataset.scene) {
    event.preventDefault();
    showScene(button.dataset.scene);
  }
}));

const koraMessage = document.querySelector('#kora-message');
const pixMessage = document.querySelector('#pix-message');
const satellite = document.querySelector('#target-satellite');
const missionAction = document.querySelector('#mission-action');
const missionSteps = [...document.querySelectorAll('.route-step')];
const missionLinks = [...document.querySelectorAll('.mission-route > b')];
const stabilityValue = document.querySelector('#stability-value');
const stabilityBar = document.querySelector('#stability-bar');

const missionStates = [
  {
    action: 'Изучить схему',
    kora: 'Сначала разделим две системы: модель выбирает инструмент по описанию, но backend независимо решает, разрешено ли действие.',
    pix: 'Схему открыл. Ничего не замкнул. Пока.'
  },
  {
    action: 'Перейти в ангар',
    kora: 'Калибровка завершена. Теперь нужен самостоятельный ремонт: добавь проверку пути и докажи её тестами.',
    pix: 'Я уже у тестового стенда. Красная лампа очень мотивирует.'
  },
  {
    action: 'Запустить симуляцию',
    kora: 'Симулятор ждёт. Успешный тест подтвердит решение, но после него я задам вопрос на перенос навыка.',
    pix: 'Ремонтный модуль подключён. Наверное, правильной стороной.'
  },
  {
    action: 'Канал восстановлен',
    kora: 'TOOLS-03 вернулся на стабильную орбиту. Навык подтверждён практикой и будет проверен в новом контексте позже.',
    pix: 'Зелёный свет! Я всегда говорил, что план был отличный.'
  }
];

let missionState = 0;

function renderMissionState() {
  const state = missionStates[missionState];
  missionAction.querySelector('span').textContent = state.action;
  koraMessage.textContent = state.kora;
  pixMessage.textContent = state.pix;
  missionSteps.forEach((step, index) => {
    step.classList.toggle('done', index < missionState);
    step.classList.toggle('active', index === missionState);
  });
  missionLinks.forEach((link, index) => link.classList.toggle('done', index < missionState));
  if (missionState === 3) {
    satellite.classList.remove('drifting');
    satellite.classList.add('stable');
    satellite.querySelector('small').textContent = 'ОРБИТА СТАБИЛЬНА';
    stabilityValue.textContent = '82%';
    stabilityBar.style.width = '82%';
  }
}

missionAction.addEventListener('click', () => {
  if (missionState === 2) {
    showScene('hangar');
    return;
  }
  missionState = Math.min(3, missionState + 1);
  renderMissionState();
});

document.querySelectorAll('[data-kora]').forEach((button) => {
  button.addEventListener('click', () => {
    koraMessage.textContent = button.dataset.kora === 'goal'
      ? 'Тебе нужно найти границу доверия: модель может запросить действие, но код приложения обязан проверить путь, роль и область доступа.'
      : 'Описание инструмента влияет на выбор модели. Permission контролирует реальные последствия. Если смешать их, убедительный промпт может обойти безопасность.';
  });
});

document.querySelector('#open-signal').addEventListener('click', () => showScene('radar'));
satellite.addEventListener('click', () => {
  koraMessage.textContent = missionState === 3
    ? 'TOOLS-03 стабилен. Данные синхронизированы с подтверждённым источником.'
    : 'Орбита нестабильна. Начни калибровку через консоль миссии.';
});

document.querySelectorAll('.system-node').forEach((node) => {
  node.addEventListener('click', () => {
    const message = document.querySelector('#map-message');
    message.innerHTML = `<b>KORA:</b> Сектор ${node.dataset.system}: ${node.querySelector('small').textContent}.`;
  });
});

const hangarHints = {
  1: 'Вопрос: что произойдёт, если path начинается с ../ и resolve построит путь выше WORKSPACE?',
  2: 'Принцип: после resolve проверь, что итоговый путь остаётся внутри доверенного корня с учётом разделителя.',
  3: 'Схема: requested === root или requested.startsWith(root + sep). Иначе отклонить запрос.'
};

document.querySelectorAll('[data-hint]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('#hangar-hint').textContent = hangarHints[button.dataset.hint];
  });
});

document.querySelector('#run-sim').addEventListener('click', (event) => {
  event.currentTarget.textContent = 'Симуляция пройдена ✓';
  event.currentTarget.style.color = 'var(--green)';
  document.querySelector('#hangar-hint').textContent = 'Тесты зелёные. Возвращаемся на мостик для стабилизации орбиты.';
  missionState = 3;
  renderMissionState();
  setTimeout(() => showScene('bridge'), 700);
});

const crewDialog = document.querySelector('#crew-dialog');
document.querySelector('#crew-button').addEventListener('click', () => crewDialog.showModal());

renderMissionState();
