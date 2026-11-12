import { describe, expect, it } from "vitest";

import {
  HISTORY_FILTERS,
  matchesFilter,
  renderCurrentRound,
  renderHistory,
  renderQuickStats,
  renderStatistics,
  renderStatusChip,
  renderThemePicker,
  TABS,
} from "../src/render.js";
import { THEMES } from "../src/themes.js";
import { calculateStatistics } from "../src/stats.js";

const RICH_HISTORY = [
  { rolls: [1, 1, 1], at: [1000, 2000, 3000] },
  { rolls: [6, 5, 4], at: [4000, 5000, 6000] },
  { rolls: [2, 2, 5], at: [7000, 8000, 9000] },
  { rolls: [3, 4, 5], at: [10000, 11000, 12000] },
  { rolls: [6, 6, 6], at: [13000, 14000, 15000] },
  { rolls: [1, 1, 2], at: [16000, 17000, 18000] },
  { rolls: [6, 6] },
];

function render(stats, activeTab) {
  const container = document.createElement("div");
  renderStatistics(container, stats, { activeTab });
  return container.innerHTML;
}

describe("matchesFilter", () => {
  const stats = calculateStatistics(RICH_HISTORY);
  const [triple, straight, double, alsoStraight, alsoTriple, small, pending] = stats.roundRecords;

  it("keeps everything under the all filter", () => {
    expect(matchesFilter(pending, "all")).toBe(true);
    expect(matchesFilter(triple, "all")).toBe(true);
  });

  it("drops in-progress rounds from every other filter", () => {
    expect(matchesFilter(pending, "big")).toBe(false);
  });

  it("matches parity, patterns and outcomes", () => {
    expect(matchesFilter(triple, "odd")).toBe(true);
    expect(matchesFilter(alsoTriple, "even")).toBe(true);
    expect(matchesFilter(double, "double")).toBe(true);
    expect(matchesFilter(triple, "double")).toBe(false);
    expect(matchesFilter(straight, "straight")).toBe(true);
    expect(matchesFilter(alsoStraight, "straight")).toBe(true);
    expect(matchesFilter(double, "straight")).toBe(false);
    expect(matchesFilter(straight, "big")).toBe(true);
    expect(matchesFilter(small, "small")).toBe(true);
    expect(matchesFilter(triple, "triple")).toBe(true);
  });
});

describe("renderStatistics", () => {
  it("renders the empty state", () => {
    const container = document.createElement("div");
    renderStatistics(container, calculateStatistics([]));
    expect(container.innerHTML).toContain("尚無統計資料");
    expect(container.innerHTML).not.toContain("data-tab");
  });

  it("exposes every tab and marks the active one", () => {
    const html = render(calculateStatistics(RICH_HISTORY), "faces");

    for (const tab of TABS) {
      expect(html).toContain(`data-tab="${tab.key}"`);
    }
    expect(html).toContain('data-tab="faces" role="tab" aria-selected="true"');
  });

  it("falls back to the overview tab for unknown keys", () => {
    const html = render(calculateStatistics(RICH_HISTORY), "nope");
    expect(html).toContain("核心數據");
    expect(html).toContain('data-tab="overview" role="tab" aria-selected="true"');
  });

  it("renders the overview tab with timing", () => {
    const html = render(calculateStatistics(RICH_HISTORY), "overview");

    expect(html).toContain("核心數據");
    expect(html).toContain("遊戲時長");
    expect(html).toContain("大小路單");
    expect(html).toContain("和值走勢");
    expect(html).toContain("最近10局");
    expect(html).toContain("bead-triple");
  });

  it("renders the overview tab without timing and with a connected road", () => {
    const stats = calculateStatistics([
      { rolls: [6, 6, 5] },
      { rolls: [6, 6, 4] },
      { rolls: [6, 5, 5] },
    ]);
    const html = render(stats, "overview");

    expect(html).toContain("尚未計時");
    expect(html).toContain("偏連");
  });

  it("renders the faces tab", () => {
    const html = render(calculateStatistics(RICH_HISTORY), "faces");

    expect(html).toContain("骰面分佈");
    expect(html).toContain("公平性檢定");
    expect(html).toContain("位置分佈");
    expect(html).toContain("同局共現矩陣");
    expect(html).toContain("骰面遺漏");
    expect(html).toContain("樣本不足");
  });

  it("renders fallback labels when hot and cold lists are empty", () => {
    const stats = calculateStatistics(RICH_HISTORY);
    stats.hotNumbers = [];
    stats.coldNumbers = [];

    expect(render(stats, "faces")).toContain("熱門骰: - | 冷門骰: -");
  });

  it("renders the sums tab", () => {
    const html = render(calculateStatistics(RICH_HISTORY), "sums");

    expect(html).toContain("和值分佈");
    expect(html).toContain("和值區間");
    expect(html).toContain("最常開出");
    expect(html).toContain("最少開出");
    expect(html).toContain("最高和值");
    expect(html).toContain("和值遺漏");
    expect(html).toContain("未出現");
  });

  it("renders the sums tab before any round completes", () => {
    const html = render(calculateStatistics([{ rolls: [6, 6] }]), "sums");

    expect(html).toContain("尚無完成局");
    expect(html).toContain("和值分佈");
  });

  it("renders the patterns tab", () => {
    const html = render(calculateStatistics(RICH_HISTORY), "patterns");

    expect(html).toContain("型態統計");
    expect(html).toContain("圍骰分佈");
    expect(html).toContain("特殊型態遺漏");
    expect(html).toContain("豹子理論值");
  });

  it("renders the trend tab", () => {
    const html = render(calculateStatistics(RICH_HISTORY), "trend");

    expect(html).toContain("連續紀錄");
    expect(html).toContain("節奏分析");
    expect(html).toContain("移動平均");
    expect(html).toContain("最近 12 局明細");
    expect(html).toContain("最長大連");
    expect(html).toContain("偏跳");
  });

  it("renders the trend tab with no completed rounds", () => {
    const html = render(calculateStatistics([{ rolls: [6, 6] }]), "trend");

    expect(html).toContain("尚無完成局");
    expect(html).toContain("再記錄 2 局");
    expect(html).toContain('<span class="sc-val">0</span>');
  });
});

describe("renderHistory", () => {
  it("renders the empty state", () => {
    const container = document.createElement("div");
    renderHistory(container, []);
    expect(container.innerHTML).toContain("尚無紀錄");
  });

  it("renders completed and in-progress rounds", () => {
    const container = document.createElement("div");
    renderHistory(container, RICH_HISTORY);

    expect(container.innerHTML).toContain("進行中 (2/3)");
    expect(container.innerHTML).toContain("順子");
    expect(container.innerHTML).toContain("對子");
    expect(container.innerHTML).toContain("豹子");
    expect(container.innerHTML).toContain("tag sp");
    expect(container.innerHTML).toContain("tag large");
    expect(container.innerHTML).toContain("首局");
    expect(container.innerHTML).toContain("較上局");
    expect(container.innerHTML).toContain("7 / 7 局");

    for (const filter of HISTORY_FILTERS) {
      expect(container.innerHTML).toContain(`data-filter="${filter.key}"`);
    }
  });

  it("applies a filter and reports an empty result", () => {
    const container = document.createElement("div");
    renderHistory(container, [{ rolls: [1, 2, 4] }], { filter: "triple" });

    expect(container.innerHTML).toContain("此篩選條件尚無紀錄");
    expect(container.innerHTML).toContain("0 / 1 局");
  });

  it("falls back to the all filter for unknown keys", () => {
    const container = document.createElement("div");
    renderHistory(container, [{ rolls: [1, 2, 4] }], { filter: "nope" });

    expect(container.innerHTML).toContain('data-filter="all"');
    expect(container.innerHTML).toContain("1 / 1 局");
  });

  it("reuses precomputed statistics", () => {
    const container = document.createElement("div");
    const stats = calculateStatistics(RICH_HISTORY);
    renderHistory(container, RICH_HISTORY, { filter: "big", stats });

    expect(container.innerHTML).toContain("2 / 7 局");
  });
});

describe("side panels", () => {
  it("renders the status chip", () => {
    expect(renderStatusChip(calculateStatistics([]))).toBe("等待第一顆骰子");
    expect(renderStatusChip(calculateStatistics(RICH_HISTORY))).toContain("6 局完成");
  });

  it("renders the current round progress", () => {
    const pending = renderCurrentRound(calculateStatistics([{ rolls: [6, 6] }]));
    expect(pending).toContain("empty-slot");
    expect(pending).toContain("已投 2/3");
    expect(pending).toContain("目前累計 12 點");

    const settled = renderCurrentRound(calculateStatistics([{ rolls: [1, 2, 3] }]));
    expect(settled).toContain("開始新的一局");
  });

  it("renders quick stats", () => {
    expect(renderQuickStats(calculateStatistics([{ rolls: [6, 6] }]))).toContain(
      "完成一局後顯示即時指標",
    );

    const filled = renderQuickStats(calculateStatistics(RICH_HISTORY));
    expect(filled).toContain("熱門骰");
    expect(filled).toContain("即時快覽");
  });
});

describe("renderThemePicker", () => {
  it("renders every style and marks the active one", () => {
    const html = renderThemePicker("neon");

    for (const theme of THEMES) {
      expect(html).toContain(`data-theme-key="${theme.key}"`);
      expect(html).toContain(theme.label);
    }
    expect(html).toContain('class="theme-chip is-active" data-theme-key="neon"');
  });
});
