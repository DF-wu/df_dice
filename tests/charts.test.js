import { describe, expect, it } from "vitest";

import { beadRoad, clampPercent, columnChart, heatGrid, meterRow, sparkline } from "../src/charts.js";

describe("clampPercent", () => {
  it("clamps into the 0-100 range", () => {
    expect(clampPercent(-1)).toBe(0);
    expect(clampPercent(0.25)).toBe(25);
    expect(clampPercent(4)).toBe(100);
  });
});

describe("meterRow", () => {
  it("renders a plain row", () => {
    const html = meterRow("大", 3, 0.75);
    expect(html).toContain("大");
    expect(html).toContain("width: 75%");
    expect(html).toContain("3 (75.00%)");
    expect(html).not.toContain("meter-marker");
  });

  it("renders tone, marker and custom meta", () => {
    const html = meterRow("小", 1, 0.25, {
      tone: "tone-small",
      markerRate: 0.5,
      meta: "custom-meta",
    });
    expect(html).toContain("tone-small");
    expect(html).toContain("left: 50%");
    expect(html).toContain("custom-meta");
  });
});

describe("columnChart", () => {
  it("renders an empty chart when every value is zero", () => {
    const html = columnChart([{ label: "3", value: 0, title: "t" }]);
    expect(html).toContain("height: 0%");
    expect(html).not.toContain("column-ghost");
    expect(html).not.toContain("is-active");
  });

  it("renders bars, ghosts and highlights", () => {
    const html = columnChart(
      [
        { label: "3", value: 2, expected: 1, title: "t3" },
        { label: "4", value: 4, expected: 12, title: "t4" },
      ],
      { highlight: "4" },
    );
    expect(html).toContain("column-ghost");
    expect(html).toContain("is-active");
    expect(html).toContain("height: 100%");
    expect(html).toContain("t3");
  });
});

describe("sparkline", () => {
  it("asks for more data below two points", () => {
    expect(sparkline([])).toContain("再記錄 2 局");
    expect(sparkline([5])).toContain("再記錄 1 局");
  });

  it("renders a polyline without a baseline", () => {
    const html = sparkline([5, 5, 5]);
    expect(html).toContain("spark-line");
    expect(html).not.toContain("spark-baseline");
  });

  it("renders a baseline when requested", () => {
    const html = sparkline([3, 18, 9], { baseline: 10.5, width: 100, height: 50 });
    expect(html).toContain("spark-baseline");
    expect(html).toContain('viewBox="0 0 100 50"');
  });
});

describe("heatGrid", () => {
  it("renders a zero matrix without a caption", () => {
    const html = heatGrid([[0, 0]], { rowLabels: ["a"], columnLabels: ["1", "2"] });
    expect(html).toContain("--heat: 0.000");
    expect(html).not.toContain("<caption>");
  });

  it("renders intensities and a caption", () => {
    const html = heatGrid(
      [
        [1, 2],
        [4, 0],
      ],
      { rowLabels: ["a", "b"], columnLabels: ["1", "2"], caption: "共現" },
    );
    expect(html).toContain("<caption>共現</caption>");
    expect(html).toContain("--heat: 1.000");
    expect(html).toContain("--heat: 0.250");
  });
});

describe("beadRoad", () => {
  it("renders an empty note", () => {
    expect(beadRoad([])).toContain("尚無路單資料");
  });

  it("renders every bead type and honours the limit", () => {
    const html = beadRoad(["big", "small", "triple", "big"], { limit: 3 });
    expect(html).toContain("bead-small");
    expect(html).toContain("bead-triple");
    expect(html).toContain("bead-big");
    expect(html).not.toContain("第 1 局");
    expect(html).toContain("第 2 局");
  });
});
