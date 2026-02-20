import { describe, expect, it } from "vitest";

import { renderHistory, renderStatistics } from "../src/render.js";
import { calculateStatistics } from "../src/stats.js";

describe("renderHistory", () => {
  it("renders empty history", () => {
    const container = document.createElement("div");
    renderHistory(container, []);
    expect(container.innerHTML).toContain("尚無紀錄");
  });

  it("renders completed and in-progress rounds", () => {
    const container = document.createElement("div");
    const history = [{ rolls: [2, 2, 2] }, { rolls: [1, 2] }, { rolls: [6, 5, 4] }, { rolls: [2, 2, 5] }];

    renderHistory(container, history);

    expect(container.innerHTML).toContain("進行中 (2/3)");
    expect(container.innerHTML).toContain("順子");
    expect(container.innerHTML).toContain("對子");
    expect(container.innerHTML).toContain("豹子");
    expect(container.innerHTML).toContain('class="sp"');
    expect(container.innerHTML).toContain('class="large"');
  });
});

describe("renderStatistics", () => {
  it("renders empty statistics", () => {
    const container = document.createElement("div");
    renderStatistics(container, calculateStatistics([]));
    expect(container.innerHTML).toContain("尚無統計資料");
  });

  it("renders full statistics sections", () => {
    const container = document.createElement("div");
    const stats = calculateStatistics([
      { rolls: [1, 1, 1] },
      { rolls: [6, 5, 4] },
      { rolls: [2, 2, 5] },
      { rolls: [3, 4, 5] },
    ]);

    renderStatistics(container, stats);

    expect(container.innerHTML).toContain("總骰數");
    expect(container.innerHTML).toContain("骰面分佈");
    expect(container.innerHTML).toContain("大小/豹子");
    expect(container.innerHTML).toContain("單雙分佈");
    expect(container.innerHTML).toContain("型態統計");
    expect(container.innerHTML).toContain("和值分佈");
    expect(container.innerHTML).toContain("最近10局");
  });

  it("renders fallback labels for unknown trend types", () => {
    const container = document.createElement("div");
    const stats = calculateStatistics([{ rolls: [1, 1, 1] }]);

    stats.recentOutcomes = ["mystery"];
    stats.streak.currentType = "mystery";
    stats.hotNumbers = [];
    stats.coldNumbers = [];

    renderStatistics(container, stats);

    expect(container.innerHTML).toContain("最近10局:</b> -");
    expect(container.innerHTML).toContain("目前大小連續:</b> -");
    expect(container.innerHTML).toContain("熱門骰:</b> -");
    expect(container.innerHTML).toContain("冷門骰:</b> -");
  });
});
