import { describe, expect, it } from "vitest";
import { calculateStatistics } from "../src/diceStats.js";
import { renderHistory, renderStatistics } from "../src/ui.js";

describe("ui renderers", () => {
  it("renders empty history", () => {
    expect(renderHistory([])).toContain("尚無紀錄");
  });

  it("renders completed and pending history rows with classes", () => {
    const html = renderHistory([
      { first: 1, second: 1, third: 1, stage: 3 },
      { first: 6, second: 5, third: 4, stage: 3 },
      { first: 1, second: 2, third: 3, stage: 3 },
      { first: 2, stage: 1 },
    ]);

    expect(html).toContain("class=\"sp\"");
    expect(html).toContain("豹子 3");
    expect(html).toContain("class=\"large\"");
    expect(html).toContain("class=\"small\"");
    expect(html).toContain("class=\"pending\"");
    expect(html).toContain("進行中 (1/3)");
  });

  it("renders statistics sections and uses 豹子 wording", () => {
    const stats = calculateStatistics([
      { first: 1, second: 1, third: 1, stage: 3 },
      { first: 2, second: 3, third: 4, stage: 3 },
    ]);

    const html = renderStatistics(stats);

    expect(html).toContain("總覽");
    expect(html).toContain("大小 / 豹子 / 單雙");
    expect(html).toContain("單顆點數");
    expect(html).toContain("總點數分布");
    expect(html).toContain("對子統計");
    expect(html).toContain("豹子統計");
    expect(html).not.toContain("圍");
  });
});
