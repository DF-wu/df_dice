export const STORAGE_KEY = "df_dice_state_v2";
export const LEGACY_KEY = "dice_history";
export const SCHEMA_VERSION = 2;

export function createEmptyState() {
  return {
    version: SCHEMA_VERSION,
    sessions: {},
    currentSessionId: "",
    draft: [],
    ui: {
      filter: "all",
    },
  };
}

export function createSession(name, { nowIso = defaultNowIso, idGen = defaultIdGen } = {}) {
  const t = nowIso();
  return {
    id: idGen(),
    name,
    createdAt: t,
    updatedAt: t,
    rounds: [],
  };
}

export function createRound(dice, { nowIso = defaultNowIso, idGen = defaultIdGen } = {}) {
  return {
    id: idGen(),
    at: nowIso(),
    dice,
  };
}

export function loadState(storage, { nowIso = defaultNowIso, idGen = defaultIdGen } = {}) {
  const raw = safeParseJson(storage.getItem(STORAGE_KEY));
  const normalized = normalizeState(raw, { nowIso, idGen });
  if (normalized) return normalized;

  const legacy = safeParseJson(storage.getItem(LEGACY_KEY));
  if (Array.isArray(legacy)) {
    const migrated = migrateLegacyHistory(legacy, { nowIso, idGen });
    if (migrated) {
      const next = createEmptyState();
      next.sessions[migrated.session.id] = migrated.session;
      next.currentSessionId = migrated.session.id;
      next.draft = migrated.draft;
      saveState(storage, next);
      storage.removeItem(LEGACY_KEY);
      return next;
    }
  }

  return createEmptyState();
}

export function saveState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function normalizeImported(raw, { nowIso = defaultNowIso, idGen = defaultIdGen } = {}) {
  const sessions = [];

  // full state backup
  const normalizedState = normalizeState(raw, { nowIso, idGen });
  if (normalizedState) {
    for (const s of Object.values(normalizedState.sessions)) sessions.push(s);
    return { sessions };
  }

  // single session
  const single = normalizeSession(raw, { nowIso, idGen });
  if (single) return { sessions: [single] };

  // legacy array
  if (Array.isArray(raw)) {
    const migrated = migrateLegacyHistory(raw, { nowIso, idGen });
    if (migrated) return { sessions: [migrated.session] };
  }

  return { sessions };
}

export function mergeImported(state, imported, { idGen = defaultIdGen } = {}) {
  for (const s of imported.sessions) {
    let id = s.id;
    while (state.sessions[id]) id = idGen();
    state.sessions[id] = { ...s, id };
  }
}

export function normalizeState(raw, { nowIso = defaultNowIso, idGen = defaultIdGen } = {}) {
  if (!isRecord(raw) || raw.version !== SCHEMA_VERSION) return null;

  const sessions = {};
  if (isRecord(raw.sessions)) {
    for (const v of Object.values(raw.sessions)) {
      const s = normalizeSession(v, { nowIso, idGen });
      if (s) sessions[s.id] = s;
    }
  }

  const draft = Array.isArray(raw.draft)
    ? raw.draft.filter((n) => Number.isInteger(n) && n >= 1 && n <= 6).slice(0, 2)
    : [];

  const filterRaw = isRecord(raw.ui) && typeof raw.ui.filter === "string" ? raw.ui.filter : "all";
  const filter =
    filterRaw === "big" || filterRaw === "small" || filterRaw === "triple" ? filterRaw : "all";

  const currentRaw = typeof raw.currentSessionId === "string" ? raw.currentSessionId : "";
  const currentSessionId = sessions[currentRaw] ? currentRaw : Object.keys(sessions)[0] || "";

  return {
    version: SCHEMA_VERSION,
    sessions,
    currentSessionId,
    draft,
    ui: {
      filter,
    },
  };
}

export function normalizeSession(raw, { nowIso = defaultNowIso, idGen = defaultIdGen } = {}) {
  if (!isRecord(raw)) return null;
  if (typeof raw.name !== "string") return null;
  if (!Array.isArray(raw.rounds)) return null;

  const rounds = raw.rounds
    .map((r) => normalizeRound(r, { nowIso, idGen }))
    .filter((r) => r !== null);

  return {
    id: typeof raw.id === "string" ? raw.id : idGen(),
    name: raw.name,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso(),
    rounds,
  };
}

export function normalizeRound(raw, { nowIso = defaultNowIso, idGen = defaultIdGen } = {}) {
  if (!isRecord(raw)) return null;
  if (!Array.isArray(raw.dice) || raw.dice.length !== 3) return null;
  const dice = raw.dice.map((n) => (typeof n === "number" ? n : Number.NaN));
  if (dice.some((n) => !Number.isInteger(n) || n < 1 || n > 6)) return null;
  return {
    id: typeof raw.id === "string" ? raw.id : idGen(),
    at: typeof raw.at === "string" ? raw.at : nowIso(),
    dice: /** @type {[number, number, number]} */ (dice),
  };
}

export function migrateLegacyHistory(list, { nowIso = defaultNowIso, idGen = defaultIdGen } = {}) {
  // legacy shape: [{ first, second?, third?, stage }...]
  const s = createSession("從舊版匯入", { nowIso, idGen });
  const rounds = [];
  /** @type {number[]} */
  let draft = [];

  for (const item of list) {
    if (!isRecord(item)) continue;
    const first = toFace(item.first);
    const second = toFace(item.second);
    const third = toFace(item.third);

    if (first && second && third) {
      rounds.push({
        id: idGen(),
        at: nowIso(),
        dice: [first, second, third],
      });
      draft = [];
    } else if (first && second) {
      draft = [first, second];
    } else if (first) {
      draft = [first];
    }
  }

  s.rounds = rounds;
  s.updatedAt = nowIso();
  return { session: s, draft };
}

export function toFace(v) {
  if (typeof v !== "number") return null;
  if (!Number.isInteger(v)) return null;
  if (v < 1 || v > 6) return null;
  return v;
}

export function safeParseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function isRecord(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function defaultNowIso() {
  return new Date().toISOString();
}

export function defaultIdGen() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
