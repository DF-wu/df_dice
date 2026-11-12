import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { createDiceApp } from "../src/app.js";

const html = readFileSync("index.html", "utf8");
const apps = [];
function mount(initial = {}, options = {}) {
  document.documentElement.innerHTML = html;
  const data = new Map(Object.entries(initial));
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  const downloads = [];
  const app = createDiceApp({ document, storage, now: () => 9000,
    downloader: (_doc, name, text) => downloads.push({ name, text }), ...options });
  apps.push(app);
  return { app, storage, data, downloads };
}
const click = (selector) => document.querySelector(selector).click();
function roll(...values) { for (const value of values) click(`.dice[data-value="${value}"]`); }
function select(id) {
  const input = document.querySelector("#sessionSelect");
  input.value = id;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
function named(name, action) {
  document.querySelector("#sessionName").value = name;
  click(action);
}
async function importFile(value, text = JSON.stringify(value)) {
  const input = document.querySelector("#importJson");
  const file = new File([text], "backup.json", { type: "application/json" });
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  document.querySelector("#exportNote").textContent = "";
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await vi.waitFor(() => expect(document.querySelector("#exportNote").textContent).not.toBe(""));
  expect(input.value).toBe("");
}
afterEach(() => { apps.splice(0).forEach((app) => app.destroy()); vi.restoreAllMocks(); });

it.each([
  [{ rolls: [1, 2, 3], at: [1000, 2000, 3000] }, { rolls: [4, 5], at: [4000, 5000] }],
  [{ first: 1, second: 2, third: 3, at: [1000, 2000, 3000] }, { first: 4, second: 5, third: 0, at: [4000, 5000] }],
])("migrates known history without losing complete/partial dice or timestamps: %j", (...records) => {
  const source = JSON.stringify(records);
  const { app, data } = mount({ dice_history: source });
  expect(app.getHistory()).toEqual([{ rolls: [1, 2, 3], at: [1000, 2000, 3000] }, { rolls: [4, 5], at: [4000, 5000] }]);
  expect(data.get("dice_history")).toBe(source);
  expect(data.get("dice_history_backup")).toBe(source);
  expect(JSON.parse(data.get("dice_sessions_v3")).sessions[0].history).toEqual(app.getHistory());
  expect(document.querySelectorAll(".history-list > li")).toHaveLength(2);
});

it("imports current JSON through the real file input and keeps exact history", async () => {
  const { app } = mount();
  roll(6);
  await importFile([{ rolls: [1, 2, 3], at: [1000, 2000, 3000] }, { rolls: [4, 5], at: [4000, 5000] }]);
  expect(app.getHistory()).toEqual([{ rolls: [1, 2, 3], at: [1000, 2000, 3000] }, { rolls: [4, 5], at: [4000, 5000] }]);
  expect(document.querySelectorAll("#sessionSelect option")).toHaveLength(2);
  expect(document.querySelectorAll(".history-list > li")).toHaveLength(2);
});

it("roundtrips its own backup, remaps colliding session IDs and retains both active drafts", async () => {
  const first = mount();
  roll(1, 2, 3, 4, 5);
  named('A,"quoted"\nname', "#btnRenameSession");
  click("#btnExportJson");
  const backup = JSON.parse(first.downloads[0].text);
  first.app.destroy(); apps.pop();
  const second = mount({ dice_sessions_v3: JSON.stringify(backup) });
  roll(6, 2);
  const destination = document.querySelector("#sessionSelect").value;
  const existing = second.app.getHistory();
  expect(existing.at(-1).rolls).toEqual([2]);
  await importFile(backup);
  const importedId = document.querySelector("#sessionSelect").value;
  expect(importedId).not.toBe(destination);
  expect(second.app.getHistory()).toEqual([{ rolls: [1, 2, 3], at: [9000, 9000, 9000] }, { rolls: [4, 5], at: [9000, 9000] }]);
  click("#btnExportCsv");
  expect(second.downloads.at(-1).text).toContain('"A,""quoted""\nname"');
  select(destination);
  expect(second.app.getHistory()).toEqual(existing);
  const stored = second.data.get("dice_sessions_v3");
  second.app.destroy(); apps.pop();
  const third = mount({ dice_sessions_v3: stored });
  expect(third.app.getHistory()).toEqual(existing);
  select(importedId);
  expect(third.app.getHistory().at(-1).rolls).toEqual([4, 5]);
});

it.each([
  [{ unrelated: true }], [{ rolls: [1, 8, 3] }], [{ rolls: [1, 2, 3, 4] }],
  [{ rolls: [1], at: ["wrong"] }], { name: "bad", rounds: [{ dice: [1, 2] }] },
  { version: 2, sessions: { x: { id: "x", name: "bad", rounds: [{ dice: [1, 2, 9] }] } }, currentSessionId: "x", draft: [] },
  { version: 2, sessions: {}, currentSessionId: "missing", draft: [4] },
].map((bad) => ({ bad })))("rejects malformed backup before mutating destination: %j", async ({ bad }) => {
  const { app, data } = mount(); roll(6, 5);
  const before = JSON.stringify([...data]);
  await importFile(bad);
  expect(app.getHistory().at(-1).rolls).toEqual([6, 5]);
  expect(JSON.stringify([...data])).toBe(before);
  expect(document.querySelector("#exportNote").textContent).toContain("失敗");
});

it("rejects invalid JSON without changes", async () => {
  const { app } = mount(); roll(2);
  await importFile(null, "{");
  expect(app.getHistory().at(-1).rolls).toEqual([2]);
  expect(document.querySelector("#exportNote").textContent).toContain("失敗");
});

it("migrates PR2 backups and keeps imported IDs and names inert in real DOM", async () => {
  const { app } = mount();
  const payload = '\" data-injected=\"yes\" onclick=\"this.dataset.executed=1';
  await importFile({ version: 2, sessions: { old: { id: "old", name: "<img onerror=alert(1)>", rounds: [{ id: payload, dice: [6, 5, 4], at: "2020-01-01T00:00:00.000Z" }] } }, currentSessionId: "old", draft: [2, 3] });
  expect(app.getHistory()).toEqual([{ rolls: [6, 5, 4], at: [1577836800000, 1577836800000, 1577836800000] }, { rolls: [2, 3] }]);
  expect(document.querySelector("[onclick], [data-injected], option img")).toBeNull();
  expect(document.querySelector("#sessionSelect").selectedOptions[0].textContent).toBe("<img onerror=alert(1)>");
  click('[data-delete-round="0"]');
  expect(app.getStats().totalRolls).toBe(2);
  expect(document.querySelectorAll(".history-list > li")).toHaveLength(1);
});

it("synchronizes rendering, per-die undo, filtering, session lifecycle, reset and reload", () => {
  const { app } = mount(); roll(1, 2, 3, 6, 6, 6, 2);
  for (let i = 0; i < 5; i++) click('[data-tab="patterns"]');
  expect(document.querySelectorAll(".history-list > li")).toHaveLength(3);
  click("#btnUndo"); click("#btnUndo");
  expect(app.getHistory().map((r) => r.rolls)).toEqual([[1, 2, 3], [6, 6]]);
  expect(app.getStats().totalRolls).toBe(5);
  expect(app.getStats().completedRounds).toBe(1);
  click('[data-filter="small"]');
  expect(document.querySelectorAll(".history-list > li")).toHaveLength(1);
  const original = document.querySelector("#sessionSelect").value;
  named("Second", "#btnCreateSession");
  expect(app.getHistory()).toEqual([]);
  roll(4, 4, 4);
  click("#btnReset"); expect(app.getHistory()).toEqual([]);
  named("Renamed", "#btnRenameSession");
  expect(document.querySelector("#sessionSelect").selectedOptions[0].textContent).toBe("Renamed");
  click("#btnDeleteSession");
  expect(document.querySelector("#sessionSelect").value).toBe(original);
  expect(app.getStats().totalRolls).toBe(5);
  click("#btnDeleteSession");
  expect(document.querySelectorAll("#sessionSelect option")).toHaveLength(1);
  expect(app.getHistory()).toEqual([]);
});

it("does not consume typing inside session controls as dice shortcuts", () => {
  const { app } = mount();
  document.querySelector("#sessionName").dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true }));
  expect(app.getHistory()).toEqual([]);
});


it.each([
  [{ first: 1, second: 2, third: 3 }, { first: 4, second: 0, third: 0 }],
  [],
  { name: "single", rounds: [{ dice: [1, 2, 3] }] },
].map((raw) => ({ raw })))("accepts recognized legacy, empty and single session backups: %j", async ({ raw }) => {
  const { app } = mount();
  await importFile(raw);
  expect(document.querySelector("#exportNote").textContent).toContain("匯入完成");
  expect(document.querySelectorAll("#sessionSelect option")).toHaveLength(2);
  expect(app.getStats().totalRolls).toBe(Array.isArray(raw) ? (raw.length === 0 ? 0 : 4) : 3);
});

it("keeps malformed source intact and blocks writes rather than replacing unrecovered history", () => {
  const source = JSON.stringify([{ unrelated: true }]);
  const { app, data } = mount({ dice_history: source });
  roll(2); click("#btnReset");
  expect(app.getHistory()).toEqual([]);
  expect(data.get("dice_history")).toBe(source);
  expect(data.has("dice_sessions_v3")).toBe(false);
  expect(document.querySelector("#exportNote").textContent).toContain("失敗");
});

it("retains the source and backup when migration save fails", () => {
  const source = JSON.stringify([{ rolls: [1, 2] }]);
  const values = new Map([["dice_history", source]]);
  const storage = { getItem: (key) => values.get(key) ?? null, removeItem: (key) => values.delete(key), setItem(key, value) {
    if (key === "dice_sessions_v3") throw new Error("Storage full");
    values.set(key, value);
  } };
  const { app } = mount({}, { storage });
  roll(6);
  expect(app.getHistory()).toEqual([]);
  expect(values.get("dice_history")).toBe(source);
  expect(values.get("dice_history_backup")).toBe(source);
});

it("migrates persisted PR2 state, retains its source, and preserves the active draft", () => {
  const raw = { version: 2, sessions: { s: { id: "s", name: "old", rounds: [] } }, currentSessionId: "s", draft: [4] };
  const source = JSON.stringify(raw);
  const { app, data } = mount({ df_dice_state_v2: source });
  expect(app.getHistory()).toEqual([{ rolls: [4] }]);
  expect(data.get("df_dice_state_v2")).toBe(source);
  expect(data.get("df_dice_state_v2_backup")).toBe(source);
});


it("does not apply rolls or imports when the canonical storage write fails", async () => {
  const { app, storage } = mount();
  const before = app.getHistory();
  vi.spyOn(storage, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
  roll(1);
  expect(app.getHistory()).toEqual(before);
  expect(document.querySelector("#exportNote").textContent).toContain("儲存失敗");
  await importFile([{ rolls: [3] }]);
  expect(app.getHistory()).toEqual(before);
  expect(document.querySelectorAll("#sessionSelect option")).toHaveLength(1);
});

it("keeps the canonical save when only the legacy compatibility copy fails", () => {
  const { app, storage, data } = mount();
  const write = storage.setItem;
  vi.spyOn(storage, "setItem").mockImplementation((key, value) => {
    if (key === "dice_history") throw new Error("Legacy copy unavailable");
    write(key, value);
  });
  roll(6);
  expect(app.getHistory()[0].rolls).toEqual([6]);
  expect(JSON.parse(data.get("dice_sessions_v3")).sessions[0].history[0].rolls).toEqual([6]);
  expect(document.querySelector("#exportNote").textContent).toContain("副本更新失敗");
});

it("ignores file cancellation and reports file read errors", () => {
  const { app } = mount();
  const input = document.querySelector("#importJson");
  input.dispatchEvent(new Event("change", { bubbles: true }));
  vi.spyOn(FileReader.prototype, "readAsText").mockImplementation(function () {
    this.dispatchEvent(new Event("error"));
  });
  Object.defineProperty(input, "files", { value: [new File(["{}"], "backup.json")] });
  input.dispatchEvent(new Event("change", { bubbles: true }));
  expect(document.querySelector("#exportNote").textContent).toContain("無法讀取");
  expect(app.getHistory()).toEqual([]);
});

it("rejects blank names without changing sessions", () => {
  mount();
  named("   ", "#btnCreateSession");
  named("", "#btnRenameSession");
  expect(document.querySelectorAll("#sessionSelect option")).toHaveLength(1);
  expect(document.querySelector("#exportNote").textContent).toContain("請輸入");
});

it("merges multiple sessions and maps imported active selection despite generated ID collisions", async () => {
  const { app } = mount();
  const existing = document.querySelector("#sessionSelect").value;
  vi.spyOn(crypto, "randomUUID").mockReturnValueOnce(existing).mockReturnValueOnce("a-new-id").mockReturnValueOnce("a-new-id").mockReturnValueOnce("b-new-id");
  await importFile({ version: 3, activeSessionId: "b", sessions: [
    { id: "a", name: "First", history: [{ rolls: [1] }] },
    { id: "b", name: "Second", history: [{ rolls: [2] }] },
  ] });
  expect(document.querySelectorAll("#sessionSelect option")).toHaveLength(3);
  expect(document.querySelector("#sessionSelect").value).toBe("b-new-id");
  expect(app.getHistory()[0].rolls).toEqual([2]);
  select("a-new-id");
  expect(app.getHistory()[0].rolls).toEqual([1]);
});
