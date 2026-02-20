import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LEGACY_KEY,
  STORAGE_KEY,
  createEmptyState,
  loadState,
  mergeImported,
  normalizeImported,
  saveState,
} from "../storage.js";
import { createMemoryStorage } from "./stubs.js";

describe("storage", () => {
  it("createEmptyState shape", () => {
    const s = createEmptyState();
    assert.equal(s.version, 2);
    assert.deepEqual(s.sessions, {});
    assert.equal(s.currentSessionId, "");
    assert.deepEqual(s.draft, []);
    assert.deepEqual(s.ui, { filter: "all" });
  });

  it("loadState returns empty state when storage is empty", () => {
    const storage = createMemoryStorage();
    const state = loadState(storage);
    assert.equal(state.version, 2);
    assert.deepEqual(state.sessions, {});
  });

  it("loadState migrates legacy dice_history", () => {
    const storage = createMemoryStorage({
      [LEGACY_KEY]: JSON.stringify([
        { first: 1, stage: 1 },
        { first: 1, second: 2, stage: 2 },
        { first: 1, second: 2, third: 3, stage: 3 },
      ]),
    });

    const ids = ["sess", "r1", "r2", "r3"];
    const idGen = () => ids.shift() ?? "x";
    const nowIso = () => "2026-01-01T00:00:00.000Z";

    const state = loadState(storage, { idGen, nowIso });
    assert.equal(Object.keys(state.sessions).length, 1);
    const session = Object.values(state.sessions)[0];
    assert.equal(session.id, "sess");
    assert.equal(session.rounds.length, 1);
    assert.equal(session.rounds[0].dice.join("-"), "1-2-3");
    assert.equal(storage.getItem(LEGACY_KEY), null);
    assert.ok(storage.getItem(STORAGE_KEY));
  });

  it("normalizeImported supports full backup state", () => {
    const state = {
      version: 2,
      sessions: {
        a: {
          id: "a",
          name: "A",
          createdAt: "t",
          updatedAt: "t",
          rounds: [{ id: "r", at: "t", dice: [1, 2, 3] }],
        },
      },
      currentSessionId: "a",
      draft: [1, 2],
      ui: { filter: "all" },
    };
    const imported = normalizeImported(state);
    assert.equal(imported.sessions.length, 1);
    assert.equal(imported.sessions[0].name, "A");
  });

  it("normalizeImported returns empty sessions for invalid input", () => {
    const imported = normalizeImported({ nope: true });
    assert.deepEqual(imported.sessions, []);
  });

  it("mergeImported avoids id collisions", () => {
    const storage = createMemoryStorage();
    const state = createEmptyState();
    state.sessions.a = {
      id: "a",
      name: "existing",
      createdAt: "t",
      updatedAt: "t",
      rounds: [],
    };
    saveState(storage, state);

    const imported = {
      sessions: [
        {
          id: "a",
          name: "imported",
          createdAt: "t",
          updatedAt: "t",
          rounds: [],
        },
      ],
    };

    const ids = ["b"];
    const idGen = () => ids.shift() ?? "x";
    mergeImported(state, imported, { idGen });
    assert.equal(Object.keys(state.sessions).length, 2);
    assert.ok(state.sessions.b);
    assert.equal(state.sessions.b.name, "imported");
  });
});
