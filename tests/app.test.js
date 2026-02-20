import { beforeEach, describe, expect, it, vi } from "vitest";

function getStoredHistory() {
  const raw = localStorage.getItem("dice_history");
  return raw ? JSON.parse(raw) : null;
}

async function mountApp(storageValue) {
  document.body.innerHTML = `
    <div class="dicePanel"></div>
    <div class="histories"></div>
    <div class="probability"></div>
    <button id="btnReset">Reset</button>
    <button id="btnUndo">Undo</button>
  `;

  localStorage.clear();
  if (storageValue !== undefined) {
    localStorage.setItem("dice_history", storageValue);
  }

  vi.resetModules();
  await import("../src/app.js");

  return {
    dicePanel: document.querySelector(".dicePanel"),
    histories: document.querySelector(".histories"),
    probability: document.querySelector(".probability"),
    btnReset: document.getElementById("btnReset"),
    btnUndo: document.getElementById("btnUndo"),
  };
}

describe("app", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("boots with empty state and disabled undo", async () => {
    const { dicePanel, histories, probability, btnUndo } = await mountApp();

    expect(dicePanel.querySelectorAll("[data-face]")).toHaveLength(6);
    expect(histories.innerHTML).toContain("尚無紀錄");
    expect(probability.innerHTML).toContain("總擲骰數: 0");
    expect(btnUndo.disabled).toBe(true);
  });

  it("loads valid storage and sanitizes it", async () => {
    const { histories, btnUndo } = await mountApp(
      JSON.stringify([
        { first: "6", second: "6", third: "6", stage: 3 },
        { first: 0, stage: 1 },
      ]),
    );

    expect(histories.innerHTML).toContain("豹子 18");
    expect(btnUndo.disabled).toBe(false);
  });

  it("ignores corrupted storage json", async () => {
    const { histories, probability } = await mountApp("{");

    expect(histories.innerHTML).toContain("尚無紀錄");
    expect(probability.innerHTML).toContain("完整回合: 0");
  });

  it("adds roll, ignores non-dice clicks, and can undo/reset", async () => {
    const { dicePanel, histories, btnUndo, btnReset } = await mountApp();

    dicePanel.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(getStoredHistory()).toBeNull();

    dicePanel
      .querySelector('[data-face="4"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(getStoredHistory()).toEqual([{ first: 4, stage: 1 }]);
    expect(histories.innerHTML).toContain("進行中 (1/3)");
    expect(btnUndo.disabled).toBe(false);

    dicePanel
      .querySelector('[data-face="2"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(getStoredHistory()).toEqual([{ first: 4, second: 2, stage: 2 }]);

    btnUndo.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(getStoredHistory()).toEqual([{ first: 4, stage: 1 }]);

    btnReset.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(getStoredHistory()).toBeNull();
    expect(histories.innerHTML).toContain("尚無紀錄");
  });

  it("still works when getItem throws and storage gets disabled", async () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    const { dicePanel, histories, btnReset } = await mountApp();

    dicePanel
      .querySelector('[data-face="3"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(histories.innerHTML).toContain("進行中 (1/3)");

    btnReset.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(histories.innerHTML).toContain("尚無紀錄");
    expect(getSpy).toHaveBeenCalled();
  });

  it("handles setItem failures without crashing", async () => {
    const { dicePanel, histories } = await mountApp();

    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("write blocked");
    });

    dicePanel
      .querySelector('[data-face="5"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(histories.innerHTML).toContain("進行中 (1/3)");
    expect(setSpy).toHaveBeenCalled();
  });

  it("handles removeItem failures without crashing", async () => {
    const { dicePanel, btnReset, histories } = await mountApp();

    dicePanel
      .querySelector('[data-face="6"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const removeSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("remove blocked");
    });

    btnReset.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(histories.innerHTML).toContain("尚無紀錄");
    expect(removeSpy).toHaveBeenCalled();
  });
});
