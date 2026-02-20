import { addRoll, normalizeHistory, undoLastRoll } from "./history.js";
import { renderHistory, renderStatistics } from "./render.js";
import { calculateStatistics } from "./stats.js";

export const STORAGE_KEY = "dice_history";

function parseStoredHistory(storage, key) {
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    return normalizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

function persistHistory(storage, key, history) {
  if (!storage) {
    return;
  }
  storage.setItem(key, JSON.stringify(history));
}

function clearHistory(storage, key) {
  if (!storage) {
    return;
  }
  storage.removeItem(key);
}

function createDiceButtons(panel, doc, onAdd) {
  panel.innerHTML = "";

  for (let value = 1; value <= 6; value += 1) {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "dice-btn";
    button.dataset.value = String(value);
    button.setAttribute("aria-label", `記錄骰子 ${value}`);

    const image = doc.createElement("img");
    image.src = `dice/dice${value}.png`;
    image.alt = `dice${value}`;
    image.width = 56;
    image.height = 56;

    const label = doc.createElement("span");
    label.className = "dice-value";
    label.textContent = `${value} 點`;

    button.appendChild(image);
    button.appendChild(label);
    button.addEventListener("click", () => onAdd(value));
    panel.appendChild(button);
  }
}

export function createDiceApp({ document, storage = null, storageKey = STORAGE_KEY } = {}) {
  if (!document) {
    throw new Error("Document is required.");
  }

  const dicePanel = document.querySelector(".dicePanel");
  const historiesDiv = document.querySelector(".histories");
  const statsDiv = document.querySelector(".probability");
  const resetButton = document.getElementById("btnReset");
  const undoButton = document.getElementById("btnUndo");
  const liveRegion = document.getElementById("liveRegion");

  if (!dicePanel || !historiesDiv || !statsDiv || !resetButton || !undoButton) {
    throw new Error("Required UI elements are missing.");
  }

  let history = parseStoredHistory(storage, storageKey);

  function announce(message) {
    if (!liveRegion) {
      return;
    }
    liveRegion.textContent = message;
  }

  function renderAll() {
    renderHistory(historiesDiv, history);
    renderStatistics(statsDiv, calculateStatistics(history));
    undoButton.disabled = history.length === 0;
  }

  function add(value) {
    history = addRoll(history, value);
    persistHistory(storage, storageKey, history);
    renderAll();
    announce(`已新增骰子 ${value}。`);
  }

  function undo() {
    history = undoLastRoll(history);
    if (history.length === 0) {
      clearHistory(storage, storageKey);
    } else {
      persistHistory(storage, storageKey, history);
    }
    renderAll();
    announce("已撤銷最新一筆。");
  }

  function reset() {
    history = [];
    clearHistory(storage, storageKey);
    renderAll();
    announce("已清空所有紀錄。");
  }

  createDiceButtons(dicePanel, document, add);

  resetButton.addEventListener("click", reset);
  undoButton.addEventListener("click", undo);

  renderAll();

  return {
    add,
    undo,
    reset,
    getHistory: () => normalizeHistory(history),
  };
}
