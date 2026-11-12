import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDiceApp, STORAGE_KEY, UI_STORAGE_KEY } from "../src/app.js";
import { THEMES } from "../src/themes.js";

const mounted = [];

function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    snapshot() {
      return Object.fromEntries(data.entries());
    },
  };
}

function setupDom({ full = true } = {}) {
  document.body.innerHTML = `
    <div class="display">
      <div class="hero-side">
        ${full ? '<div class="status-chip" id="statusChip"></div><div id="themeBar"></div>' : ""}
      </div>
      <div class="dicePanel"></div>
      <div class="control">
        <button id="btnUndo">Undo Last</button>
        <button id="btnReset">Reset</button>
      </div>
      ${full ? '<section class="current-round"></section><section class="quick-stats"></section>' : ""}
      ${
        full
          ? `<div class="control triple">
               <button id="btnExportJson">JSON</button>
               <button id="btnExportCsv">CSV</button>
               <button id="btnCopySummary">Copy</button>
             </div>
             <p id="exportNote"></p>`
          : ""
      }
      <div class="resultPanel">
        <div class="histories"></div>
        <div class="probability"></div>
      </div>
    </div>
  `;
}

function mount(options) {
  const app = createDiceApp(options);
  mounted.push(app);
  return app;
}

function click(element) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function press(key, init = {}) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...init }));
}

function addRound(app, values) {
  for (const value of values) {
    app.add(value);
  }
}

describe("createDiceApp", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    while (mounted.length > 0) {
      mounted.pop().destroy();
    }
  });

  it("validates required inputs", () => {
    expect(() => createDiceApp()).toThrow("Document is required.");

    document.body.innerHTML = `<div class="dicePanel"></div>`;
    expect(() => createDiceApp({ document, storage: createMemoryStorage() })).toThrow(
      "Required UI elements are missing.",
    );
  });

  it("loads legacy data and renders initial state", () => {
    setupDom();
    const storage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify([{ first: 4, second: 4, third: 4, stage: 3 }]),
    });

    const app = mount({ document, storage });

    expect(app.getHistory()).toEqual([{ rolls: [4, 4, 4] }]);
    expect(document.querySelector(".histories").textContent).toContain("豹子");
    expect(document.querySelector("#btnUndo").disabled).toBe(false);
    expect(document.querySelectorAll(".dice")).toHaveLength(6);
    expect(document.getElementById("statusChip").textContent).toContain("1 局完成");
    expect(document.querySelector(".current-round").textContent).toContain("開始新的一局");
    expect(document.querySelector(".quick-stats").textContent).toContain("即時快覽");
  });

  it("handles invalid storage JSON", () => {
    setupDom();
    const storage = createMemoryStorage({ [STORAGE_KEY]: "{", [UI_STORAGE_KEY]: "{" });
    const app = mount({ document, storage });

    expect(app.getHistory()).toEqual([]);
    expect(app.getUi()).toEqual({ activeTab: "overview", filter: "all", theme: "casino" });
    expect(document.querySelector(".histories").textContent).toContain("尚無紀錄");
    expect(document.querySelector("#btnUndo").disabled).toBe(true);
  });

  it("adds rolls with timestamps, undoes and resets", () => {
    setupDom();
    const storage = createMemoryStorage();
    let clock = 1000;
    mount({ document, storage, now: () => (clock += 1000) });

    click(document.querySelector('.dice[data-value="1"]'));
    click(document.querySelector('.dice[data-value="2"]'));
    click(document.querySelector('.dice[data-value="3"]'));

    let persisted = JSON.parse(storage.snapshot()[STORAGE_KEY]);
    expect(persisted).toEqual([{ rolls: [1, 2, 3], at: [2000, 3000, 4000] }]);
    expect(document.querySelector(".histories").textContent).toContain("小");

    click(document.getElementById("btnUndo"));
    persisted = JSON.parse(storage.snapshot()[STORAGE_KEY]);
    expect(persisted).toEqual([{ rolls: [1, 2], at: [2000, 3000] }]);
    expect(document.querySelector(".histories").textContent).toContain("進行中");

    click(document.getElementById("btnUndo"));
    click(document.getElementById("btnUndo"));
    expect(storage.snapshot()[STORAGE_KEY]).toBeUndefined();
    expect(document.querySelector(".histories").textContent).toContain("尚無紀錄");
    expect(document.getElementById("btnUndo").disabled).toBe(true);

    click(document.querySelector('.dice[data-value="6"]'));
    click(document.getElementById("btnReset"));
    expect(storage.snapshot()[STORAGE_KEY]).toBeUndefined();
    expect(document.querySelector(".histories").textContent).toContain("尚無紀錄");
  });

  it("supports keyboard shortcuts", () => {
    setupDom();
    const app = mount({ document, storage: null, now: () => null });

    press("4");
    press("5");
    expect(app.getHistory()).toEqual([{ rolls: [4, 5] }]);

    press("Backspace");
    expect(app.getHistory()).toEqual([{ rolls: [4] }]);

    press("9");
    press("a");
    press("2", { ctrlKey: true });
    press("2", { metaKey: true });
    press("2", { altKey: true });
    expect(app.getHistory()).toEqual([{ rolls: [4] }]);
  });

  it("switches tabs and persists the choice", () => {
    setupDom();
    const storage = createMemoryStorage();
    const app = mount({ document, storage });
    addRound(app, [1, 2, 3]);

    click(document.querySelector('[data-tab="faces"]'));
    expect(app.getUi().activeTab).toBe("faces");
    expect(document.querySelector(".probability").textContent).toContain("公平性檢定");
    expect(JSON.parse(storage.snapshot()[UI_STORAGE_KEY]).activeTab).toBe("faces");

    click(document.querySelector(".stats-grid"));
    expect(app.getUi().activeTab).toBe("faces");
  });

  it("switches history filters and persists the choice", () => {
    setupDom();
    const storage = createMemoryStorage();
    const app = mount({ document, storage });
    addRound(app, [1, 1, 1]);
    addRound(app, [6, 6, 5]);

    click(document.querySelector('[data-filter="triple"]'));
    expect(app.getUi().filter).toBe("triple");
    expect(document.querySelector(".histories").textContent).toContain("1 / 2 局");

    click(document.querySelector(".history-list"));
    expect(app.getUi().filter).toBe("triple");
  });

  it("restores persisted ui preferences", () => {
    setupDom();
    const storage = createMemoryStorage({
      [STORAGE_KEY]: JSON.stringify([{ rolls: [1, 2, 3] }]),
      [UI_STORAGE_KEY]: JSON.stringify({ activeTab: "trend", filter: "small", theme: "neon" }),
    });

    const app = mount({ document, storage });

    expect(app.getUi()).toEqual({ activeTab: "trend", filter: "small", theme: "neon" });
    expect(document.documentElement.dataset.theme).toBe("neon");
    expect(document.querySelector('[data-theme-key="neon"]').className).toContain("is-active");
  });

  it("ignores malformed ui preferences", () => {
    setupDom();
    const storage = createMemoryStorage({
      [UI_STORAGE_KEY]: JSON.stringify({ activeTab: "nope", filter: "nope", theme: "nope" }),
    });

    expect(mount({ document, storage }).getUi()).toEqual({
      activeTab: "overview",
      filter: "all",
      theme: "casino",
    });
  });

  it("treats a null stored ui payload as defaults", () => {
    setupDom();
    const storage = createMemoryStorage({ [UI_STORAGE_KEY]: "null" });
    expect(mount({ document, storage }).getUi().theme).toBe("casino");
  });

  it("switches between every ui style", () => {
    setupDom();
    const storage = createMemoryStorage();
    const app = mount({ document, storage });

    expect(document.querySelectorAll("[data-theme-key]")).toHaveLength(THEMES.length);

    for (const theme of THEMES) {
      click(document.querySelector(`[data-theme-key="${theme.key}"]`));
      expect(app.getUi().theme).toBe(theme.key);
      expect(document.documentElement.dataset.theme).toBe(theme.key);
      expect(JSON.parse(storage.snapshot()[UI_STORAGE_KEY]).theme).toBe(theme.key);
    }

    click(document.getElementById("themeBar"));
    expect(app.getUi().theme).toBe(THEMES[THEMES.length - 1].key);
  });

  it("exports json and csv through the injected downloader", () => {
    setupDom();
    const downloader = vi.fn();
    const app = mount({ document, storage: null, downloader });
    addRound(app, [1, 2, 3]);

    click(document.getElementById("btnExportJson"));
    expect(downloader).toHaveBeenCalledWith(
      document,
      "dice-history.json",
      expect.stringContaining('"rolls"'),
      "application/json",
    );

    click(document.getElementById("btnExportCsv"));
    expect(downloader).toHaveBeenLastCalledWith(
      document,
      "dice-history.csv",
      expect.stringContaining("和值"),
      "text/csv",
    );
    expect(document.getElementById("exportNote").textContent).toContain("CSV");
  });

  it("copies the summary when a clipboard is available", () => {
    setupDom();
    const clipboard = { writeText: vi.fn() };
    const app = mount({ document, storage: null, clipboard });
    addRound(app, [1, 2, 3]);

    click(document.getElementById("btnCopySummary"));

    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("骰局統計摘要"));
    expect(document.getElementById("exportNote").textContent).toContain("已複製");
  });

  it("reports when no clipboard is available", () => {
    setupDom();
    const app = mount({ document, storage: null });

    expect(app.copySummary()).toContain("尚無紀錄");
    expect(document.getElementById("exportNote").textContent).toContain("不支援剪貼簿");
  });

  it("works without the optional panels", () => {
    setupDom({ full: false });
    const app = mount({ document, storage: null, downloader: vi.fn() });

    app.add(2);
    app.setTheme("neon");
    app.exportJson();
    app.exportCsv();
    app.copySummary();
    app.setTab("sums");
    app.setFilter("big");
    app.undo();
    app.reset();

    expect(app.getHistory()).toEqual([]);
    expect(app.getStats().totalRolls).toBe(0);
    expect(document.querySelector(".probability").textContent).toContain("尚無統計資料");
  });

  it("falls back to the real downloader when none is injected", () => {
    setupDom();
    const app = mount({ document, storage: null });
    const created = [];
    const original = document.createElement.bind(document);
    const spy = vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const element = original(tag);
      if (tag === "a") {
        element.click = vi.fn();
        created.push(element);
      }
      return element;
    });

    app.exportJson();
    spy.mockRestore();

    expect(created).toHaveLength(1);
    expect(created[0].download).toBe("dice-history.json");
    expect(created[0].click).toHaveBeenCalled();
    expect(document.querySelector('a[download="dice-history.json"]')).toBeNull();
  });
});
