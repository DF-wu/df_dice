import { emptyState, loadSessions, mergeBackup, newSession, SESSION_STORAGE_KEY } from "./sessions.js";
import { downloadText, toCsvText, toJsonText, toSummaryText } from "./export.js";
import { addRoll, DIE_MAX, DIE_MIN, normalizeHistory, undoLastRoll } from "./history.js";
import {
  HISTORY_FILTERS,
  renderCurrentRound,
  renderHistory,
  renderQuickStats,
  renderStatistics,
  renderStatusChip,
  renderThemePicker,
  TABS,
} from "./render.js";
import { DEFAULT_THEME, isTheme } from "./themes.js";
import { calculateStatistics } from "./stats.js";

export const STORAGE_KEY = "dice_history";
export const UI_STORAGE_KEY = "dice_ui";

const DEFAULT_UI = { activeTab: "overview", filter: "all", theme: DEFAULT_THEME };

function readJson(storage, key) {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseStoredUi(storage, key) {
  const raw = readJson(storage, key);
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_UI };
  }

  return {
    activeTab: TABS.some((tab) => tab.key === raw.activeTab) ? raw.activeTab : DEFAULT_UI.activeTab,
    filter: HISTORY_FILTERS.some((entry) => entry.key === raw.filter) ? raw.filter : DEFAULT_UI.filter,
    theme: isTheme(raw.theme) ? raw.theme : DEFAULT_UI.theme,
  };
}

function writeJson(storage, key, value) {
  if (!storage) {
    return;
  }
  storage.setItem(key, JSON.stringify(value));
}

function removeKey(storage, key) {
  if (!storage) {
    return;
  }
  storage.removeItem(key);
}

function bindClick(element, handler) {
  if (element) {
    element.addEventListener("click", handler);
  }
}

function setHtml(element, html) {
  if (element) {
    element.innerHTML = html;
  }
}

function createDiceButtons(panel, doc, onAdd) {
  panel.innerHTML = "";

  for (let value = DIE_MIN; value <= DIE_MAX; value += 1) {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "dice";
    button.dataset.value = String(value);
    button.setAttribute("aria-label", `記錄骰子 ${value}`);

    const image = doc.createElement("img");
    image.src = `dice/dice${value}.png`;
    image.alt = `骰子 ${value}`;

    const label = doc.createElement("span");
    label.className = "dice-value";
    label.textContent = `${value} 點`;

    button.append(image, label);
    button.addEventListener("click", () => onAdd(value));
    panel.appendChild(button);
  }
}

export function createDiceApp({
  document,
  storage = null,
  storageKey = STORAGE_KEY,
  uiStorageKey = UI_STORAGE_KEY,
  now = () => Date.now(),
  clipboard = null,
  downloader = downloadText,
} = {}) {
  if (!document) {
    throw new Error("Document is required.");
  }

  const dicePanel = document.querySelector(".dicePanel");
  const historiesDiv = document.querySelector(".histories");
  const statsDiv = document.querySelector(".probability");
  const resetButton = document.getElementById("btnReset");
  const undoButton = document.getElementById("btnUndo");

  if (!dicePanel || !historiesDiv || !statsDiv || !resetButton || !undoButton) {
    throw new Error("Required UI elements are missing.");
  }

  const statusChip = document.getElementById("statusChip");
  const currentRoundPanel = document.querySelector(".current-round");
  const quickStatsPanel = document.querySelector(".quick-stats");
  const exportNote = document.getElementById("exportNote");
  const themeBar = document.getElementById("themeBar");

  let state;
  let savedCanonical = null;
  let loadFailed = false;
  try {
    state = loadSessions(storage, storageKey);
    savedCanonical = storage?.getItem(SESSION_STORAGE_KEY) ?? null;
  } catch {
    state = emptyState();
    loadFailed = true;
    note("讀取失敗，原始資料已保留；請先備份瀏覽器儲存資料再繼續。");
  }
  let history = activeSession().history;
  const sessionSelect = document.getElementById("sessionSelect");
  const sessionName = document.getElementById("sessionName");
  const importInput = document.getElementById("importJson");

  function activeSession() {
    return state.sessions.find((session) => session.id === state.activeSessionId);
  }

  function save(next) {
    if (loadFailed) { note("讀取失敗，原始資料已保留；請先備份瀏覽器儲存資料再繼續。"); return false; }
    try {
      if (storage && storage.getItem(SESSION_STORAGE_KEY) !== savedCanonical) {
        note("資料已在其他分頁變更，請重新載入後再操作。");
        return false;
      }
      const serialized = JSON.stringify(next);
      storage?.setItem(SESSION_STORAGE_KEY, serialized);
      savedCanonical = serialized;
    } catch {
      note("儲存失敗，原有資料未變更");
      return false;
    }
    state = next;
    history = activeSession().history;
    renderAll();
    try {
      if (history.length === 0) removeKey(storage, storageKey);
      else writeJson(storage, storageKey, history);
    } catch {
      note("主備份已儲存，舊版相容副本更新失敗");
    }
    return true;
  }

  function saveHistory(nextHistory) {
    save({ ...state, sessions: state.sessions.map((session) => session.id === state.activeSessionId ? { ...session, history: nextHistory } : session) });
  }

  function renderSessions() {
    if (!sessionSelect || !sessionName) return;
    sessionSelect.replaceChildren();
    for (const session of state.sessions) {
      const option = document.createElement("option");
      option.value = session.id;
      option.textContent = session.name;
      option.selected = session.id === state.activeSessionId;
      sessionSelect.append(option);
    }
    sessionName.value = activeSession().name;
  }

  function createSession() {
    const name = sessionName.value.trim();
    if (!name) return note("請輸入對局名稱");
    const session = newSession(name);
    save({ ...state, sessions: [...state.sessions, session], activeSessionId: session.id });
  }

  function renameSession() {
    const name = sessionName.value;
    if (!name.trim()) return note("請輸入對局名稱");
    save({ ...state, sessions: state.sessions.map((session) => session.id === state.activeSessionId ? { ...session, name } : session) });
  }

  function deleteSession() {
    if (!document.defaultView.confirm("確定刪除這個對局及全部紀錄？")) return;
    const sessions = state.sessions.filter((session) => session.id !== state.activeSessionId);
    save(sessions.length === 0 ? emptyState() : { ...state, sessions, activeSessionId: sessions[0].id });
  }

  function importJson() {
    const file = importInput.files[0];
    if (!file) return;
    const reader = new document.defaultView.FileReader();
    reader.onload = () => {
      try {
        const next = mergeBackup(state, JSON.parse(reader.result));
        if (save(next)) note("匯入完成，原有對局與未完成紀錄均已保留");
      } catch {
        note("匯入失敗，請檢查 JSON 備份格式；原有資料未變更");
      }
      importInput.value = "";
    };
    reader.onerror = () => { note("匯入失敗，無法讀取檔案"); importInput.value = ""; };
    reader.readAsText(file);
  }
  let ui = parseStoredUi(storage, uiStorageKey);
  let stats = calculateStatistics(history);

  function persistUi() {
    writeJson(storage, uiStorageKey, ui);
  }

  function applyTheme() {
    document.documentElement.dataset.theme = ui.theme;
    setHtml(themeBar, renderThemePicker(ui.theme));
  }

  function renderAll() {
    renderSessions();
    stats = calculateStatistics(history);
    renderStatistics(statsDiv, stats, { activeTab: ui.activeTab });
    renderHistory(historiesDiv, history, { filter: ui.filter, stats });
    setHtml(statusChip, renderStatusChip(stats));
    setHtml(currentRoundPanel, renderCurrentRound(stats));
    setHtml(quickStatsPanel, renderQuickStats(stats));
    undoButton.disabled = history.length === 0;
  }

  function note(message) {
    if (exportNote) exportNote.textContent = message;
  }

  function add(value) {
    saveHistory(addRoll(history, value, now()));
  }

  function undo() {
    saveHistory(undoLastRoll(history));
  }

  function reset() {
    saveHistory([]);
  }

  function setTab(tab) {
    ui = { ...ui, activeTab: tab };
    persistUi();
    renderAll();
  }

  function setFilter(filter) {
    ui = { ...ui, filter };
    persistUi();
    renderAll();
  }

  function setTheme(theme) {
    ui = { ...ui, theme };
    persistUi();
    applyTheme();
  }

  function exportJson() {
    downloader(document, "dice-history.json", toJsonText(state), "application/json");
    note(`已匯出 ${history.length} 局 JSON`);
  }

  function exportCsv() {
    downloader(document, "dice-history.csv", toCsvText(stats, activeSession().name), "text/csv");
    note(`已匯出 ${stats.roundRecords.length} 列 CSV`);
  }

  function copySummary() {
    const text = toSummaryText(stats);
    if (clipboard) {
      clipboard.writeText(text);
      note("統計摘要已複製到剪貼簿");
      return text;
    }
    note("此環境不支援剪貼簿，請改用匯出功能");
    return text;
  }

  function onStatsClick(event) {
    const trigger = event.target.closest("[data-tab]");
    if (trigger) {
      setTab(trigger.dataset.tab);
    }
  }

  function onHistoryClick(event) {
    const deletion = event.target.closest("[data-delete-round]");
    if (deletion) {
      saveHistory(history.filter((_round, index) => index !== Number(deletion.dataset.deleteRound)));
      return;
    }
    const trigger = event.target.closest("[data-filter]");
    if (trigger) {
      setFilter(trigger.dataset.filter);
    }
  }

  function onThemeClick(event) {
    const trigger = event.target.closest("[data-theme-key]");
    if (trigger) {
      setTheme(trigger.dataset.themeKey);
    }
  }

  function onKeyDown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.("input, select, textarea, [contenteditable]")) {
      return;
    }

    const value = Number(event.key);
    if (Number.isInteger(value) && value >= DIE_MIN && value <= DIE_MAX) {
      event.preventDefault();
      add(value);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      undo();
    }
  }

  createDiceButtons(dicePanel, document, add);

  resetButton.addEventListener("click", reset);
  undoButton.addEventListener("click", undo);
  statsDiv.addEventListener("click", onStatsClick);
  historiesDiv.addEventListener("click", onHistoryClick);
  document.addEventListener("keydown", onKeyDown);
  bindClick(themeBar, onThemeClick);
  bindClick(document.getElementById("btnExportJson"), exportJson);
  bindClick(document.getElementById("btnExportCsv"), exportCsv);
  bindClick(document.getElementById("btnCopySummary"), copySummary);

  bindClick(document.getElementById("btnCreateSession"), createSession);
  bindClick(document.getElementById("btnRenameSession"), renameSession);
  bindClick(document.getElementById("btnDeleteSession"), deleteSession);
  sessionSelect?.addEventListener("change", () => {
    if (!save({ ...state, activeSessionId: sessionSelect.value })) renderSessions();
  });
  importInput?.addEventListener("change", importJson);

  applyTheme();
  renderAll();

  return {
    add,
    undo,
    reset,
    setTab,
    setFilter,
    setTheme,
    exportJson,
    exportCsv,
    copySummary,
    getUi: () => ({ ...ui }),
    getStats: () => stats,
    getHistory: () => normalizeHistory(history),
    destroy: () => document.removeEventListener("keydown", onKeyDown),
  };
}
