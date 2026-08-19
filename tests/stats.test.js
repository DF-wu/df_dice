import { describe, expect, it } from "vitest";

import { analyzeCompletedRound, calculateStatistics } from "../src/stats.js";

function chunk(values) {
  const rounds = [];
  for (let index = 0; index < values.length; index += 3) {
    rounds.push({ rolls: values.slice(index, index + 3) });
  }
  return rounds;
}

function repeatFaces(counts) {
  const values = [];
  counts.forEach((count, index) => {
    for (let step = 0; step < count; step += 1) {
      values.push(index + 1);
    }
  });
  return values;
}

describe("analyzeCompletedRound", () => {
  it("classifies rounds correctly", () => {
    expect(() => analyzeCompletedRound({ rolls: [1, 2] })).toThrow(
      "A completed round requires exactly 3 rolls.",
    );
    expect(() => analyzeCompletedRound(null)).toThrow(
      "A completed round requires exactly 3 rolls.",
    );
    expect(() => analyzeCompletedRound({ rolls: "nope" })).toThrow(
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
    expect(stats.extremes).toBeNull();
    expect(stats.timing).toBeNull();
    expect(stats.roundRecords).toEqual([]);
    expect(stats.spread).toEqual({ mean: 0, median: 0, stdDev: 0, min: null, max: null, range: 0 });
    expect(stats.chiSquare).toEqual({
      value: 0,
      expected: 0,
      degreesOfFreedom: 5,
      verdict: "waiting",
    });
    expect(stats.gaps.triple).toBeNull();
    expect(stats.gaps.byFace).toEqual([null, null, null, null, null, null]);
    expect(stats.switchRate).toBe(0);
    expect(stats.outcomeStreak).toEqual({ currentValue: null, currentLength: 0, longest: {} });
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

    expect(stats.bucketCounts).toEqual({ low: 1, midLow: 1, midHigh: 1, high: 1 });
    expect(stats.bucketRates.low).toBe(0.25);

    expect(stats.streak).toEqual({
      currentType: "big",
      currentLength: 1,
      longestBig: 1,
      longestSmall: 1,
    });

    expect(stats.hotNumbers).toEqual([1, 5, 6]);
    expect(stats.coldNumbers).toEqual([3]);
    expect(stats.recentOutcomes).toEqual(["triple", "big", "small", "big"]);
    expect(stats.outcomes).toEqual(["triple", "big", "small", "big"]);

    expect(stats.outcomeRates).toEqual({ big: 0.5, small: 0.25, triple: 0.25 });
    expect(stats.parityRates).toEqual({ odd: 0.75, even: 0.25 });
    expect(stats.patternRates).toEqual({ double: 0.25, triple: 0.25, straight: 0.5 });
    expect(stats.sumRates[3]).toBe(0.25);

    expect(stats.tripleCounts).toEqual([1, 0, 0, 0, 0, 0]);
    expect(stats.positionCounts[0]).toEqual([1, 1, 1, 0, 0, 2]);
    expect(stats.pairMatrix[0][0]).toBe(3);
    expect(stats.pairMatrix[3][4]).toBe(2);
    expect(stats.pairMatrix[4][3]).toBe(2);

    expect(stats.spread.median).toBe(10.5);
    expect(stats.spread.min).toBe(3);
    expect(stats.spread.max).toBe(15);
    expect(stats.spread.range).toBe(12);
    expect(stats.extremes).toEqual({
      highest: { sum: 15, index: 2 },
      lowest: { sum: 3, index: 1 },
    });

    expect(stats.gaps.triple).toBe(3);
    expect(stats.gaps.big).toBe(0);
    expect(stats.gaps.small).toBe(1);
    expect(stats.gaps.double).toBe(1);
    expect(stats.gaps.straight).toBe(0);
    expect(stats.gaps.byFace[2]).toBe(0);
    expect(stats.gaps.bySum[3]).toBe(3);
    expect(stats.gaps.bySum[18]).toBeNull();

    expect(stats.faceDeviation[0]).toMatchObject({ face: 1, count: 3 });
    expect(stats.faceDeviation[0].deltaCount).toBeCloseTo(3 - 14 / 6, 10);

    expect(stats.topSums[0]).toMatchObject({ sum: 3, count: 1 });
    expect(stats.rareSums[0].count).toBe(0);

    expect(stats.movingAverages).toEqual([3, 9, 9, 9.75]);
    expect(stats.sumSeries).toEqual([3, 15, 9, 12]);

    expect(stats.roundRecords).toHaveLength(5);
    expect(stats.roundRecords[4]).toMatchObject({ index: 5, complete: false, outcome: null });
    expect(stats.roundRecords[4].analysis).toBeNull();
    expect(stats.roundRecords[0]).toMatchObject({ index: 1, complete: true, outcome: "triple" });
    expect(stats.roundRecords[0].startedAt).toBeNull();

    expect(stats.switches).toBe(2);
    expect(stats.switchRate).toBe(1);
    expect(stats.parityStreak.longest).toEqual({ odd: 3, even: 1 });
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
    expect(stats.outcomeStreak.longest).toEqual({ big: 2, small: 1 });
    expect(stats.switches).toBe(1);
    expect(stats.switchRate).toBe(0.5);
  });

  it("keeps only the ten most recent outcomes in the trend list", () => {
    const history = Array.from({ length: 12 }, () => ({ rolls: [1, 1, 2] }));
    const stats = calculateStatistics(history);

    expect(stats.outcomes).toHaveLength(12);
    expect(stats.recentOutcomes).toHaveLength(10);
    expect(stats.movingAverages[11]).toBe(4);
  });

  it("computes an odd-length median", () => {
    const stats = calculateStatistics([
      { rolls: [1, 1, 1] },
      { rolls: [2, 2, 2] },
      { rolls: [6, 6, 6] },
    ]);

    expect(stats.spread.median).toBe(6);
    expect(stats.averageSum).toBeCloseTo(9, 10);
  });

  it("flags a fair distribution once enough rolls are recorded", () => {
    const history = [];
    for (let step = 0; step < 5; step += 1) {
      history.push({ rolls: [1, 2, 3] }, { rolls: [4, 5, 6] });
    }

    const stats = calculateStatistics(history);
    expect(stats.totalRolls).toBe(30);
    expect(stats.chiSquare.value).toBeCloseTo(0, 10);
    expect(stats.chiSquare.expected).toBe(5);
    expect(stats.chiSquare.verdict).toBe("fair");
  });

  it("flags a mildly skewed distribution", () => {
    const stats = calculateStatistics(chunk(repeatFaces([11, 8, 4, 3, 2, 2])));

    expect(stats.totalRolls).toBe(30);
    expect(stats.chiSquare.value).toBeCloseTo(13.6, 10);
    expect(stats.chiSquare.verdict).toBe("watch");
  });

  it("flags a heavily skewed distribution", () => {
    const stats = calculateStatistics(chunk(repeatFaces([30, 0, 0, 0, 0, 0])));

    expect(stats.chiSquare.value).toBeCloseTo(150, 10);
    expect(stats.chiSquare.verdict).toBe("biased");
  });

  it("stays in the waiting state below the sample threshold", () => {
    const stats = calculateStatistics([{ rolls: [1, 1, 1] }]);
    expect(stats.chiSquare.verdict).toBe("waiting");
  });

  it("summarizes timing when timestamps are present", () => {
    const stats = calculateStatistics([
      { rolls: [1, 2, 3], at: [1000, 3000, 5000] },
      { rolls: [4, 5, 6], at: [7000, 9000, 11000] },
    ]);

    expect(stats.timing).toEqual({
      firstAt: 1000,
      lastAt: 11000,
      elapsedMs: 10000,
      trackedRolls: 6,
      averageRollMs: 2000,
      averageRoundMs: 6000,
    });
    expect(stats.roundRecords[0].startedAt).toBe(1000);
    expect(stats.roundRecords[0].endedAt).toBe(5000);
  });

  it("ignores timing when fewer than two timestamps exist", () => {
    expect(calculateStatistics([{ rolls: [1, 2, 3], at: [1000, null, null] }]).timing).toBeNull();
  });
});
