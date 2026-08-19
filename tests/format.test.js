import { describe, expect, it } from "vitest";

import {
  formatClock,
  formatDuration,
  formatGap,
  formatOutcomeClass,
  formatOutcomeLabel,
  formatParity,
  formatPercent,
  formatSigned,
  formatSignedPercent,
  formatVerdict,
} from "../src/format.js";

describe("number formatting", () => {
  it("formats percentages", () => {
    expect(formatPercent(0.5)).toBe("50.00%");
    expect(formatPercent(0.5, 1)).toBe("50.0%");
  });

  it("formats signed values", () => {
    expect(formatSigned(1.234)).toBe("+1.23");
    expect(formatSigned(-1.234)).toBe("-1.23");
    expect(formatSigned(0)).toBe("0.00");
    expect(formatSigned(3, 0)).toBe("+3");
    expect(formatSignedPercent(0.05, 1)).toBe("+5.0%");
    expect(formatSignedPercent(-0.05, 1)).toBe("-5.0%");
  });
});

describe("label formatting", () => {
  it("maps known and unknown outcomes", () => {
    expect(formatOutcomeLabel("big")).toBe("大");
    expect(formatOutcomeLabel("small")).toBe("小");
    expect(formatOutcomeLabel("triple")).toBe("豹子");
    expect(formatOutcomeLabel(null)).toBe("-");

    expect(formatOutcomeClass("big")).toBe("large");
    expect(formatOutcomeClass("small")).toBe("small");
    expect(formatOutcomeClass("triple")).toBe("sp");
    expect(formatOutcomeClass("mystery")).toBe("");

    expect(formatParity("odd")).toBe("單");
    expect(formatParity("even")).toBe("雙");
    expect(formatParity(undefined)).toBe("-");
  });

  it("describes gaps", () => {
    expect(formatGap(null)).toBe("未出現");
    expect(formatGap(0)).toBe("本局");
    expect(formatGap(4)).toBe("4 局前");
  });

  it("describes fairness verdicts", () => {
    expect(formatVerdict("fair")).toBe("分佈均勻");
    expect(formatVerdict("watch")).toBe("略有偏斜");
    expect(formatVerdict("biased")).toBe("明顯偏斜");
    expect(formatVerdict("waiting")).toBe("樣本不足");
  });
});

describe("time formatting", () => {
  it("formats durations across magnitudes", () => {
    expect(formatDuration(Number.NaN)).toBe("-");
    expect(formatDuration(-1)).toBe("-");
    expect(formatDuration(9000)).toBe("9 秒");
    expect(formatDuration(125000)).toBe("2 分 5 秒");
    expect(formatDuration(3720000)).toBe("1 時 2 分");
  });

  it("formats clock times", () => {
    expect(formatClock(null)).toBe("--:--");

    const stamp = new Date(2026, 0, 2, 7, 5, 9).getTime();
    expect(formatClock(stamp)).toBe("07:05:09");
  });
});
