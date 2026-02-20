import { addRoll, calculateStatistics, sanitizeHistory, undoLastRoll } from "./diceStats.js";
import { renderHistory, renderStatistics } from "./ui.js";

const STORAGE_KEY = "dice_history";

const dicePanel = document.querySelector(".dicePanel");
const historiesDiv = document.querySelector(".histories");
const statisticsDiv = document.querySelector(".probability");
const btnReset = document.getElementById("btnReset");
const btnUndo = document.getElementById("btnUndo");

let storageEnabled = true;
let history = loadHistory();

function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    storageEnabled = false;
    return null;
  }
}

function safeSetItem(key, value) {
  if (!storageEnabled) {
    return;
  }

  try {
    localStorage.setItem(key, value);
  } catch {
    storageEnabled = false;
  }
}

function safeRemoveItem(key) {
  if (!storageEnabled) {
    return;
  }

  try {
    localStorage.removeItem(key);
  } catch {
    storageEnabled = false;
  }
}

function loadHistory() {
  const raw = safeGetItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return sanitizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

function persist() {
  safeSetItem(STORAGE_KEY, JSON.stringify(history));
}

function drawDicePanel() {
  const html = [];
  for (let face = 1; face <= 6; face += 1) {
    html.push(`<button class="diceBtn" type="button" data-face="${face}" aria-label="骰子 ${face}">
      <img class="dice" src="dice/dice${face}.png" alt="dice${face}">
      <span class="diceLabel">${face}</span>
    </button>`);
  }
  dicePanel.innerHTML = html.join("");
}

function render() {
  historiesDiv.innerHTML = renderHistory(history);
  const stats = calculateStatistics(history);
  statisticsDiv.innerHTML = renderStatistics(stats);
  btnUndo.disabled = !stats.meta.canUndo;
}

function resetAll() {
  history = [];
  safeRemoveItem(STORAGE_KEY);
  render();
}

function undoLatest() {
  history = undoLastRoll(history);
  persist();
  render();
}

function onDiceClick(event) {
  const target = event.target.closest("[data-face]");
  if (!target) {
    return;
  }

  history = addRoll(history, Number(target.dataset.face));
  persist();
  render();
}

btnReset.addEventListener("click", resetAll);
btnUndo.addEventListener("click", undoLatest);
dicePanel.addEventListener("click", onDiceClick);

drawDicePanel();
render();
