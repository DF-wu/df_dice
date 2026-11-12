import { expect, it } from "vitest";
import { calculateStatistics } from "../src/stats.js";

it("independently counts all 216 ordered outcomes and the missing pattern metrics", () => {
  const history = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) history.push({ rolls: [a, b, c] });
  const stats = calculateStatistics(history);
  expect(stats.completedRounds).toBe(216);
  expect(stats.totalRolls).toBe(648);
  expect(stats.faceCounts).toEqual([108, 108, 108, 108, 108, 108]);
  expect(stats.outcomeCounts).toEqual({ big: 105, small: 105, triple: 6 });
  expect(stats.parityCounts).toEqual({ odd: 108, even: 108 });
  expect(stats.patternCounts.double).toBe(90);
  expect(stats.distinctCount).toBe(120);
  expect(stats.doubleByFace).toEqual([16, 16, 16, 16, 16, 16]);
  expect(stats.occurrencesByFace).toEqual(Array.from({ length: 6 }, () => [125, 75, 15, 1]));
  expect(Object.keys(stats.multisetCounts)).toHaveLength(56);
  expect(stats.multisetCounts["1-2-3"]).toBe(6);
  expect(stats.multisetCounts["1-1-2"]).toBe(3);
  expect(stats.multisetCounts["1-1-1"]).toBe(1);
  expect(stats.averageSum).toBe(10.5);
  expect(stats.spread.stdDev).toBeCloseTo(Math.sqrt(8.75));
});

it("ranks repeated multiset patterns by count then numeric key, ignoring drafts", () => {
  const stats = calculateStatistics([{ rolls: [3, 1, 2] }, { rolls: [2, 3, 1] }, { rolls: [6, 6, 6] }, { rolls: [1, 1] }]);
  expect(stats.topPatterns).toEqual([{ pattern: "1-2-3", count: 2 }, { pattern: "6-6-6", count: 1 }]);
  expect(stats.distinctCount).toBe(2);
});
