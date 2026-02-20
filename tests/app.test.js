import { beforeEach, describe, expect, it } from "vitest";

import { createDiceApp, STORAGE_KEY } from "../src/app.js";

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

function setupDom({ withLiveRegion = false } = {}) {
  document.body.innerHTML = `
    <div class="display">
      <div class="dicePanel"></div>
      <div class="control">
        <button id="btnUndo">Undo Last</button>
        <button id="btnReset">Reset</button>
      </div>
      <div class="resultPanel">
        <div class="histories"></div>
        <div class="probability"></div>
      </div>
      ${withLiveRegion ? '<div id="liveRegion" aria-live="polite"></div>' : ""}
    </div>
  `;
}

function click(element) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("createDiceApp", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
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

    const app = createDiceApp({ document, storage });

    expect(app.getHistory()).toEqual([{ rolls: [4, 4, 4] }]);
    expect(document.querySelector(".histories").textContent).toContain("豹子");
    expect(document.querySelector("#btnUndo").disabled).toBe(false);
    expect(document.querySelectorAll(".dice-btn")).toHaveLength(6);
    expect(document.querySelector('.dice-btn[data-value="1"]').getAttribute("aria-label")).toContain("記錄骰子");
  });

  it("handles invalid storage JSON", () => {
    setupDom();
    const storage = createMemoryStorage({ [STORAGE_KEY]: "{" });
    const app = createDiceApp({ document, storage });

    expect(app.getHistory()).toEqual([]);
    expect(document.querySelector(".histories").textContent).toContain("尚無紀錄");
    expect(document.querySelector("#btnUndo").disabled).toBe(true);
  });

  it("adds rolls, undoes latest record, and resets", () => {
    setupDom();
    const storage = createMemoryStorage();
    createDiceApp({ document, storage });

    click(document.querySelector('.dice-btn[data-value="1"]'));
    click(document.querySelector('.dice-btn[data-value="2"]'));
    click(document.querySelector('.dice-btn[data-value="3"]'));

    let persisted = JSON.parse(storage.snapshot()[STORAGE_KEY]);
    expect(persisted).toEqual([{ rolls: [1, 2, 3] }]);
    expect(document.querySelector(".histories").textContent).toContain("小");

    click(document.getElementById("btnUndo"));
    persisted = JSON.parse(storage.snapshot()[STORAGE_KEY]);
    expect(persisted).toEqual([{ rolls: [1, 2] }]);
    expect(document.querySelector(".histories").textContent).toContain("進行中");

    click(document.getElementById("btnUndo"));
    click(document.getElementById("btnUndo"));
    expect(storage.snapshot()[STORAGE_KEY]).toBeUndefined();
    expect(document.querySelector(".histories").textContent).toContain("尚無紀錄");
    expect(document.getElementById("btnUndo").disabled).toBe(true);

    click(document.querySelector('.dice-btn[data-value="6"]'));
    click(document.getElementById("btnReset"));
    expect(storage.snapshot()[STORAGE_KEY]).toBeUndefined();
    expect(document.querySelector(".histories").textContent).toContain("尚無紀錄");
  });

  it("supports no-storage mode", () => {
    setupDom();
    const app = createDiceApp({ document, storage: null });

    app.add(2);
    app.undo();
    app.reset();

    expect(app.getHistory()).toEqual([]);
    expect(document.querySelector(".probability").textContent).toContain("尚無統計資料");
  });

  it("announces add, undo, and reset via live region", () => {
    setupDom({ withLiveRegion: true });
    const storage = createMemoryStorage();
    createDiceApp({ document, storage });

    click(document.querySelector('.dice-btn[data-value="3"]'));
    expect(document.getElementById("liveRegion").textContent).toContain("已新增骰子 3");

    click(document.getElementById("btnUndo"));
    expect(document.getElementById("liveRegion").textContent).toContain("已撤銷最新一筆");

    click(document.getElementById("btnReset"));
    expect(document.getElementById("liveRegion").textContent).toContain("已清空所有紀錄");
  });
});
