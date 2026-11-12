import { normalizeHistory } from "./history.js";

export const SESSION_STORAGE_KEY = "dice_sessions_v3";
export const PREVIOUS_STORAGE_KEY = "df_dice_state_v2";

function requireValid(condition) {
  if (!condition) throw new Error("Invalid dice backup.");
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function faces(values, max = 3) {
  requireValid(Array.isArray(values) && values.length <= max && values.every((n) => Number.isInteger(n) && n >= 1 && n <= 6));
  return values;
}

export function validateHistory(raw) {
  requireValid(Array.isArray(raw));
  const history = raw.map((entry) => {
    requireValid(record(entry));
    let rolls;
    if (Array.isArray(entry.rolls)) {
      rolls = faces(entry.rolls);
    } else if (Array.isArray(entry.dice)) {
      rolls = faces(entry.dice);
      requireValid(rolls.length === 3);
    } else {
      const values = [entry.first, entry.second, entry.third];
      const end = values.findIndex((value) => value === undefined || value === null || value === 0);
      rolls = faces(end === -1 ? values : values.slice(0, end));
      requireValid(values.slice(rolls.length).every((value) => value === undefined || value === null || value === 0));
    }
    requireValid(rolls.length > 0);
    let at = entry.at;
    if (typeof at === "string" && Array.isArray(entry.dice)) {
      const stamp = Date.parse(at);
      at = rolls.map(() => stamp);
    }
    if (at !== undefined) {
      requireValid(Array.isArray(at) && at.length === rolls.length && at.every((n) => n === null || (typeof n === "number" && Number.isFinite(n) && n > 0)));
      return { rolls, at };
    }
    return { rolls };
  });
  requireValid(history.slice(0, -1).every((entry) => entry.rolls.length === 3));
  return normalizeHistory(history);
}

export function newSession(name = "新對局") {
  return { id: crypto.randomUUID(), name, history: [] };
}

export function emptyState() {
  const session = newSession();
  return { version: 3, sessions: [session], activeSessionId: session.id };
}

// All formats become the existing timestamped history representation before mutation.
export function parseBackup(raw) {
  if (Array.isArray(raw)) {
    const session = { ...newSession("匯入紀錄"), history: validateHistory(raw) };
    return { version: 3, sessions: [session], activeSessionId: session.id };
  }
  requireValid(record(raw));
  let sessions;
  let activeSessionId;
  if (raw.version === 3) {
    requireValid(Array.isArray(raw.sessions) && raw.sessions.length > 0);
    sessions = raw.sessions.map((session) => {
      requireValid(record(session) && typeof session.id === "string" && typeof session.name === "string");
      return { id: session.id, name: session.name, history: validateHistory(session.history) };
    });
    activeSessionId = raw.activeSessionId;
  } else if (raw.version === 2) {
    requireValid(record(raw.sessions) && Object.keys(raw.sessions).length > 0);
    sessions = Object.values(raw.sessions).map((session) => {
      requireValid(record(session) && typeof session.id === "string" && typeof session.name === "string");
      return { id: session.id, name: session.name, history: validateHistory(session.rounds) };
    });
    activeSessionId = raw.currentSessionId;
    const active = sessions.find((session) => session.id === activeSessionId);
    requireValid(active !== undefined);
    const draft = faces(raw.draft, 2);
    if (draft.length > 0) {
      requireValid(active.history.every((entry) => entry.rolls.length === 3));
      active.history.push({ rolls: [...draft] });
    }
  } else {
    requireValid(raw.version === undefined && typeof raw.name === "string" && Array.isArray(raw.rounds));
    const session = { ...newSession(raw.name), history: validateHistory(raw.rounds) };
    sessions = [session];
    activeSessionId = session.id;
  }
  requireValid(new Set(sessions.map((session) => session.id)).size === sessions.length);
  requireValid(sessions.some((session) => session.id === activeSessionId));
  return { version: 3, sessions, activeSessionId };
}

export function mergeBackup(state, raw) {
  const imported = parseBackup(raw);
  let activeSessionId;
  const used = new Set(state.sessions.map((entry) => entry.id));
  const sessions = imported.sessions.map((session) => {
    let id = crypto.randomUUID();
    while (used.has(id)) id = crypto.randomUUID();
    used.add(id);
    if (session.id === imported.activeSessionId) activeSessionId = id;
    return { ...session, id };
  });
  return { version: 3, sessions: [...state.sessions, ...sessions], activeSessionId };
}

export function loadSessions(storage, historyKey) {
  if (!storage) return emptyState();
  const saved = storage.getItem(SESSION_STORAGE_KEY);
  if (saved !== null) return parseBackup(JSON.parse(saved));
  const previous = storage.getItem(PREVIOUS_STORAGE_KEY);
  const legacy = storage.getItem(historyKey);
  const source = previous ?? legacy;
  if (source === null) return emptyState();
  const state = parseBackup(JSON.parse(source));
  const sourceKey = previous === null ? historyKey : PREVIOUS_STORAGE_KEY;
  // Keep the source and a recovery copy; only a validated canonical save is accepted.
  if (storage.getItem(`${sourceKey}_backup`) === null) storage.setItem(`${sourceKey}_backup`, source);
  storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  requireValid(storage.getItem(SESSION_STORAGE_KEY) === JSON.stringify(state));
  return state;
}
