import { describe, expect, it } from "vitest";

import { analyzeCompletedRound, calculateStatistics } from "../src/stats.js";

describe("analyzeCompletedRound", () => {
  it("classifies rounds correctly", () => {
    expect(() => analyzeCompletedRound({ rolls: [1, 2] })).toThrow(
      "A completed round requires exactly 3 rolls.",
    );

    expect(analyzeCompletedRound({ rolls: [1, 1, 1] })).toEqual({
      sum: 3,
      triple: true,
      double: false,
      straight: false,
      parity: "odd",
      sizeType: null,
    });

    expect(analyzeCompletedRound({ rolls: [2, 2, 5] })).toEqual({
      sum: 9,
      triple: false,
      double: true,
      straight: false,
      parity: "odd",
      sizeType: "small",
    });

    expect(analyzeCompletedRound({ rolls: [6, 5, 4] })).toEqual({
      sum: 15,
      triple: false,
      double: false,
      straight: true,
      parity: "odd",
      sizeType: "big",
    });
  });
});

describe("calculateStatistics", () => {
  it("returns zeroed statistics for empty history", () => {
    const stats = calculateStatistics([]);
    expect(stats.totalRolls).toBe(0);
    expect(stats.totalRounds).toBe(0);
    expect(stats.completedRounds).toBe(0);
    expect(stats.inProgressRolls).toBe(0);
    expect(stats.averageSum).toBe(0);
    expect(stats.faceCounts).toEqual([0, 0, 0, 0, 0, 0]);
    expect(stats.hotNumbers).toEqual([]);
    expect(stats.coldNumbers).toEqual([]);
    expect(stats.recentOutcomes).toEqual([]);
  });

  it("computes comprehensive sic-bo style statistics", () => {
    const history = [
      { rolls: [1, 1, 1] },
      { rolls: [6, 5, 4] },
      { rolls: [2, 2, 5] },
      { rolls: [3, 4, 5] },
      { rolls: [6, 6] },
    ];

    const stats = calculateStatistics(history);

    expect(stats.totalRolls).toBe(14);
    expect(stats.totalRounds).toBe(5);
    expect(stats.completedRounds).toBe(4);
    expect(stats.inProgressRolls).toBe(2);
    expect(stats.averageSum).toBe(9.75);

    expect(stats.faceCounts).toEqual([3, 2, 1, 2, 3, 3]);
    expect(stats.outcomeCounts).toEqual({ big: 2, small: 1, triple: 1 });
    expect(stats.parityCounts).toEqual({ odd: 3, even: 1 });
    expect(stats.patternCounts).toEqual({ double: 1, triple: 1, straight: 2 });

    expect(stats.sumCounts[3]).toBe(1);
    expect(stats.sumCounts[9]).toBe(1);
    expect(stats.sumCounts[12]).toBe(1);
    expect(stats.sumCounts[15]).toBe(1);
    expect(stats.sumCounts[18]).toBe(0);

    expect(stats.streak).toEqual({
      currentType: "big",
      currentLength: 1,
      longestBig: 1,
      longestSmall: 1,
    });

    expect(stats.hotNumbers).toEqual([1, 5, 6]);
    expect(stats.coldNumbers).toEqual([3]);
    expect(stats.recentOutcomes).toEqual(["triple", "big", "small", "big"]);

    expect(stats.outcomeRates).toEqual({ big: 0.5, small: 0.25, triple: 0.25 });
    expect(stats.parityRates).toEqual({ odd: 0.75, even: 0.25 });
    expect(stats.patternRates).toEqual({ double: 0.25, triple: 0.25, straight: 0.5 });
    expect(stats.sumRates[3]).toBe(0.25);
  });

  it("tracks consecutive big/small streaks correctly", () => {
    const stats = calculateStatistics([
      { rolls: [6, 5, 4] },
      { rolls: [6, 6, 5] },
      { rolls: [1, 1, 2] },
    ]);

    expect(stats.recentOutcomes).toEqual(["big", "big", "small"]);
    expect(stats.streak).toEqual({
      currentType: "small",
      currentLength: 1,
      longestBig: 2,
      longestSmall: 1,
    });
  });
});
