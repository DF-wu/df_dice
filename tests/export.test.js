import { describe, expect, it, vi } from "vitest";

import { CSV_HEADER, downloadText, toCsvText, toJsonText, toSummaryText } from "../src/export.js";
import { calculateStatistics } from "../src/stats.js";

const HISTORY = [
  { rolls: [1, 1, 1], at: [1000, 2000, 3000] },
  { rolls: [2, 2, 5] },
  { rolls: [4, 5, 6] },
  { rolls: [6, 6] },
];

describe("toJsonText", () => {
  it("serializes the raw history", () => {
    const text = toJsonText(HISTORY);
    expect(JSON.parse(text)).toEqual(HISTORY);
    expect(text).toContain("\n");
  });
});

describe("toCsvText", () => {
  it("writes a header plus one row per round", () => {
    const rows = toCsvText(calculateStatistics(HISTORY)).split("\n");

    expect(rows[0]).toBe(CSV_HEADER.join(","));
    expect(rows).toHaveLength(5);
    expect(rows[1]).toContain("1,1,1,1,3,豹子,單,N,Y,N");
    expect(rows[2]).toContain("2,2,2,5,9,小,單,Y,N,N");
    expect(rows[3]).toContain("3,4,5,6,15,大,單,N,N,Y");
    expect(rows[4]).toBe("4,6,6,,,進行中,,,,,");
  });
});

describe("toSummaryText", () => {
  it("reports an empty history", () => {
    expect(toSummaryText(calculateStatistics([]))).toBe("骰局統計：尚無紀錄。");
  });

  it("summarizes a populated history", () => {
    const text = toSummaryText(calculateStatistics(HISTORY));

    expect(text).toContain("【骰局統計摘要】");
    expect(text).toContain("總骰數 11");
    expect(text).toContain("豹子 1");
    expect(text).toContain("熱門骰");
    expect(text).toContain("最近走勢");
  });
});

describe("downloadText", () => {
  it("creates, clicks and removes a temporary anchor", () => {
    const anchor = { click: vi.fn(), remove: vi.fn() };
    const doc = {
      createElement: vi.fn(() => anchor),
      body: { appendChild: vi.fn() },
    };

    downloadText(doc, "a.csv", "點,值", "text/csv");

    expect(doc.createElement).toHaveBeenCalledWith("a");
    expect(anchor.href).toBe(`data:text/csv;charset=utf-8,${encodeURIComponent("點,值")}`);
    expect(anchor.download).toBe("a.csv");
    expect(doc.body.appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalled();
    expect(anchor.remove).toHaveBeenCalled();
  });

  it("defaults to plain text", () => {
    const anchor = { click: vi.fn(), remove: vi.fn() };
    const doc = { createElement: () => anchor, body: { appendChild: vi.fn() } };

    downloadText(doc, "a.txt", "hi");
    expect(anchor.href).toContain("data:text/plain;charset=utf-8,hi");
  });
});
