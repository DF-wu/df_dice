import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { startApp } from "../app.js";
import { STORAGE_KEY, saveState } from "../storage.js";
import { createAppDom, createMemoryStorage, StubElement } from "./stubs.js";

describe("app", () => {
  it("startApp throws when document is missing", () => {
    assert.throws(() => startApp(), /missing document/);
  });

  it("startApp throws when storage is missing", () => {
    const { doc } = createAppDom();
    assert.throws(() => startApp({ document: doc }), /missing storage/);
  });

  it("startApp throws when required DOM element is missing", () => {
    const doc = createAppDom().doc;
    doc._byId.delete("historyList");
    const storage = createMemoryStorage();
    assert.throws(() => startApp({ document: doc, storage }), /Missing element/);
  });

  it("default session lifecycle + add/undo/delete keeps stats correct", async () => {
    const { doc, elements } = createAppDom();
    const storage = createMemoryStorage();
    const alerts = [];
    globalThis.alert = (msg) => alerts.push(String(msg));

    const downloads = [];
    const downloadText = (filename, text, contentType) => {
      downloads.push({ filename, text, contentType });
    };

    const app = startApp({
      document: doc,
      storage,
      prompt: () => "ignored",
      confirm: () => true,
      clipboard: { writeText: async () => {} },
      downloadText,
      nowIso: () => "2026-01-01T00:00:00.000Z",
      idGen: (() => {
        let i = 0;
        return () => `id-${i++}`;
      })(),
    });

    // draft
    app.addDie(1);
    assert.ok(elements.draftMeta.textContent.includes("還差"));
    app.addDie(2);
    app.addDie(3);
    assert.ok(elements.statsSummary.textContent.includes("共 1 回合"));
    assert.ok(elements.historyList.innerHTML.includes("historyItem"));

    // undo removes last round
    await elements.btnUndo.click();
    assert.equal(elements.statsSummary.textContent, "尚無紀錄");

    // undo removes draft die
    app.addDie(1);
    app.undo();
    assert.equal(app.getState().draft.length, 0);

    // undo does nothing on empty
    app.undo();

    // deleteRound no-op
    app.deleteRound("nope");
    assert.equal(elements.statsSummary.textContent, "尚無紀錄");

    // add one round then delete it
    app.addDie(6);
    app.addDie(6);
    app.addDie(5);
    const roundId = app.getState().sessions[app.getState().currentSessionId].rounds[0].id;
    app.deleteRound(roundId);
    assert.equal(elements.statsSummary.textContent, "尚無紀錄");

    // export JSON + CSV (via click handlers)
    elements.btnExportJson.click();
    elements.btnExportCsv.click();
    assert.equal(downloads.length, 2);
    assert.ok(downloads[0].filename.endsWith(".json"));
    assert.ok(downloads[1].filename.endsWith(".csv"));
    assert.deepEqual(alerts, []);
  });

  it("copy summary falls back when clipboard is unavailable", async () => {
    const { doc, elements } = createAppDom();
    const storage = createMemoryStorage();
    let lastAlert = "";
    globalThis.alert = (msg) => {
      lastAlert = String(msg);
    };

    const app = startApp({
      document: doc,
      storage,
      prompt: () => "ignored",
      confirm: () => true,
      toastEl: new StubElement("div"),
      downloadText: () => {},
    });

    app.addDie(1);
    app.addDie(2);
    app.addDie(3);

    await elements.btnCopySummary.click();
    assert.ok(lastAlert.includes("【"));
  });

  it("import handles invalid JSON, invalid shape, confirm cancel, and success", async () => {
    const { doc, elements } = createAppDom();
    const storage = createMemoryStorage();
    const alerts = [];
    globalThis.alert = (msg) => alerts.push(String(msg));

    let confirmValue = true;
    const confirm = () => confirmValue;

    const app = startApp({
      document: doc,
      storage,
      confirm,
      prompt: () => "ignored",
      toastEl: new StubElement("div"),
      downloadText: () => {},
      idGen: (() => {
        let i = 0;
        return () => `id-${i++}`;
      })(),
      nowIso: () => "2026-01-01T00:00:00.000Z",
    });

    // no file
    elements.fileImport.files = undefined;
    await elements.fileImport.dispatchEvent({ type: "change" });

    // invalid JSON
    elements.fileImport.files = [
      {
        text: async () => "not-json",
      },
    ];
    await elements.fileImport.dispatchEvent({ type: "change" });
    assert.ok(alerts.some((x) => x.includes("匯入失敗")));

    // non-Error thrown
    elements.fileImport.files = [
      {
        text: async () => {
          throw "boom";
        },
      },
    ];
    await elements.fileImport.dispatchEvent({ type: "change" });
    assert.ok(alerts.some((x) => x.includes("boom")));

    // invalid shape
    elements.fileImport.files = [
      {
        text: async () => JSON.stringify({ nope: true }),
      },
    ];
    await elements.fileImport.dispatchEvent({ type: "change" });
    assert.ok(alerts.some((x) => x.includes("檔案格式不正確")));

    // confirm cancel
    confirmValue = false;
    elements.fileImport.files = [
      {
        text: async () =>
          JSON.stringify({
            version: 2,
            sessions: {
              a: {
                id: "a",
                name: "A",
                createdAt: "t",
                updatedAt: "t",
                rounds: [],
              },
            },
            currentSessionId: "a",
            draft: [],
            ui: { filter: "all" },
          }),
      },
    ];
    await elements.fileImport.dispatchEvent({ type: "change" });
    assert.equal(Object.keys(app.getState().sessions).length, 1);

    // success
    confirmValue = true;
    elements.fileImport.files = [
      {
        text: async () =>
          JSON.stringify({
            version: 2,
            sessions: {
              b: {
                id: "b",
                name: "B",
                createdAt: "t",
                updatedAt: "t",
                rounds: [],
              },
            },
            currentSessionId: "b",
            draft: [],
            ui: { filter: "all" },
          }),
      },
    ];
    await elements.fileImport.dispatchEvent({ type: "change" });
    assert.equal(Object.keys(app.getState().sessions).length, 2);
  });

  it("hot dice distributions cover chi-square threshold branches", () => {
    const baseRounds = [
      [1, 2, 3],
      [1, 2, 4],
      [1, 2, 5],
      [1, 3, 4],
      [1, 3, 5],
      [1, 4, 5],
      [1, 2, 3],
      [1, 4, 5],
      [1, 2, 4],
      [1, 3, 5],
    ];

    const variants = [
      {
        name: "normal",
        rounds: baseRounds,
        expect: "目前看起來正常",
      },
      {
        name: "p05",
        rounds: baseRounds.map((d, i) => (i === 9 ? [1, 3, 1] : d)),
        expect: "可能偏骰",
      },
      {
        name: "p01",
        rounds: baseRounds.map((d, i) => {
          if (i === 1) return [1, 2, 1];
          if (i === 3) return [1, 3, 1];
          return d;
        }),
        expect: "可疑",
      },
      {
        name: "p001",
        rounds: baseRounds.map((d, i) => {
          if (i === 1) return [1, 2, 1];
          if (i === 3) return [1, 3, 1];
          if (i === 5) return [1, 1, 5];
          if (i === 7) return [1, 1, 5];
          return d;
        }),
        expect: "高度可疑",
      },
    ];

    for (const v of variants) {
      const { doc, elements } = createAppDom();
      const storage = createMemoryStorage();
      globalThis.alert = () => {};

      const state = {
        version: 2,
        sessions: {
          s: {
            id: "s",
            name: v.name,
            createdAt: "t",
            updatedAt: "t",
            rounds: v.rounds.map((dice, idx) => ({
              id: `r${idx}`,
              at: "2026-01-01T00:00:00.000Z",
              dice,
            })),
          },
        },
        currentSessionId: "s",
        draft: [],
        ui: { filter: "all" },
      };
      saveState(storage, state);

      startApp({
        document: doc,
        storage,
        confirm: () => true,
        prompt: () => "ignored",
        toastEl: new StubElement("div"),
        downloadText: () => {},
      });

      assert.ok(
        elements.chiSquare.textContent.includes(v.expect),
        `${v.name} should include ${v.expect}`,
      );
    }
  });

  it("event handlers cover click fallbacks + keydown ignore", () => {
    const { doc, elements } = createAppDom();
    const storage = createMemoryStorage();
    globalThis.alert = () => {};

    startApp({
      document: doc,
      storage,
      confirm: () => true,
      prompt: () => "ignored",
      toastEl: new StubElement("div"),
      downloadText: () => {},
    });

    // dicePad click with no match
    elements.dicePad.dispatchEvent({ type: "click", target: new StubElement("div") });

    // dicePad click fallback path (no closest)
    elements.dicePad.dispatchEvent({
      type: "click",
      target: {
        getAttribute: (k) => (k === "data-face" ? "1" : null),
      },
    });
    assert.ok(elements.draftDice.innerHTML.includes("dice1.png"));

    // invalid face
    elements.dicePad.dispatchEvent({
      type: "click",
      target: {
        getAttribute: (k) => (k === "data-face" ? "9" : null),
      },
    });

    // historyList click non-delete
    elements.historyList.dispatchEvent({ type: "click", target: new StubElement("div") });
    const btn = new StubElement("button");
    btn.setAttribute("data-action", "noop");
    elements.historyList.dispatchEvent({ type: "click", target: btn });

    // keydown ignored when focusing input
    doc.activeElement = { tagName: "INPUT" };
    doc.dispatchEvent({ type: "keydown", key: "1", preventDefault() {} });

    // keydown ignored when contentEditable
    doc.activeElement = { tagName: "DIV", isContentEditable: true };
    doc.dispatchEvent({ type: "keydown", key: "1", preventDefault() {} });

    // keydown triggers add + undo + clear draft
    doc.activeElement = null;
    doc.dispatchEvent({ type: "keydown", key: "2", preventDefault() {} });
    doc.dispatchEvent({ type: "keydown", key: "Backspace", preventDefault() {} });
    doc.dispatchEvent({ type: "keydown", key: "Escape", preventDefault() {} });
    doc.dispatchEvent({ type: "keydown", key: "x", preventDefault() {} });
  });

  it("session controls + branchy paths", async () => {
    const { doc, elements } = createAppDom();
    const storage = createMemoryStorage();
    globalThis.alert = () => {};

    // preload invalid currentSessionId to hit ensureSessionExists() fallback
    saveState(storage, {
      version: 2,
      sessions: {
        s1: {
          id: "s1",
          name: "S1",
          createdAt: "t",
          updatedAt: "t",
          rounds: [],
        },
      },
      currentSessionId: "missing",
      draft: [1, 2, 3],
      ui: { filter: "nope" },
    });

    const promptValues = [null, "   ", "新局", null, "  ", "改名"]; // new session x3, rename x3
    const prompt = () => promptValues.shift();
    const confirmValues = [false, true, false, true]; // delete, delete, reset, reset
    const confirm = () => confirmValues.shift();
    let copied = "";

    const app = startApp({
      document: doc,
      storage,
      prompt,
      confirm,
      clipboard: {
        writeText: async (t) => {
          copied = t;
        },
      },
      toastEl: new StubElement("div"),
      downloadText: () => {},
      nowIso: () => "2026-01-01T00:00:00.000Z",
      idGen: (() => {
        let i = 0;
        return () => `id-${i++}`;
      })(),
    });

    // new session: null / empty / ok
    await elements.btnNewSession.click();
    await elements.btnNewSession.click();
    await elements.btnNewSession.click();
    assert.equal(Object.keys(loadStateSnapshot(storage).sessions).length, 2);

    // rename: null / empty / ok
    await elements.btnRenameSession.click();
    await elements.btnRenameSession.click();
    await elements.btnRenameSession.click();

    // switch session
    const snap = loadStateSnapshot(storage);
    const ids = Object.keys(snap.sessions);
    elements.sessionSelect.value = ids[1];
    await elements.sessionSelect.dispatchEvent({ type: "change" });

    // clear draft (click first dice)
    await elements.dicePad.dispatchEvent({
      type: "click",
      target: elements.dicePad.children[0],
    });
    await elements.btnClearDraft.click();

    // reset session: confirm false then true
    await elements.btnResetSession.click();
    await elements.btnResetSession.click();

    // delete session: confirm false then true
    await elements.btnDeleteSession.click();
    await elements.btnDeleteSession.click();

    // filter
    elements.filterSelect.value = "big";
    await elements.filterSelect.dispatchEvent({ type: "change" });

    // copy summary success
    await elements.btnCopySummary.click();
    assert.ok(copied.includes("【"));

    // history click branches (delete missing id)
    const btn = new StubElement("button");
    btn.setAttribute("data-action", "delete");
    await elements.historyList.dispatchEvent({ type: "click", target: btn });

    // history delete via event handler (valid id)
    app.addDie(6);
    app.addDie(6);
    app.addDie(5);
    const roundId = app.getState().sessions[app.getState().currentSessionId].rounds[0].id;
    const del = new StubElement("button");
    del.setAttribute("data-action", "delete");
    del.setAttribute("data-round-id", roundId);
    await elements.historyList.dispatchEvent({ type: "click", target: del });
  });

  it("showToast unref false branch when setTimeout returns a number", () => {
    const { doc, elements } = createAppDom();
    const storage = createMemoryStorage();
    globalThis.alert = () => {};

    const oldSet = globalThis.setTimeout;
    const oldClear = globalThis.clearTimeout;
    globalThis.setTimeout = () => 1;
    globalThis.clearTimeout = () => {};

    startApp({
      document: doc,
      storage,
      confirm: () => true,
      prompt: () => "ignored",
      downloadText: () => {},
    });
    elements.btnExportJson.click();
    elements.btnExportCsv.click();

    globalThis.setTimeout = oldSet;
    globalThis.clearTimeout = oldClear;
  });

  it("defaultDownloadText + structuredCloneSafe branches", () => {
    const { doc, elements } = createAppDom();
    const storage = createMemoryStorage();
    globalThis.document = doc;
    globalThis.alert = () => {};

    // cover default download (no injected downloadText)
    const app = startApp({
      document: doc,
      storage,
      confirm: () => true,
      prompt: () => "ignored",
      toastEl: new StubElement("div"),
    });
    elements.btnExportJson.click();

    // cover structuredCloneSafe JSON fallback
    const old = globalThis.structuredClone;
    globalThis.structuredClone = undefined;
    const st = app.getState();
    assert.ok(st.version === 2);
    globalThis.structuredClone = old;
  });
});

function loadStateSnapshot(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}
