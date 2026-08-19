import { describe, expect, it } from "vitest";

import {
  bucketOf,
  buildBucketMap,
  buildSumMap,
  SUM_BUCKETS,
  THEORY,
  TOTAL_OUTCOMES,
} from "../src/theory.js";

describe("theory tables", () => {
  it("enumerates all 216 outcomes", () => {
    expect(TOTAL_OUTCOMES).toBe(216);

    const sumTotal = Object.values(THEORY.sumCounts).reduce((total, count) => total + count, 0);
    expect(sumTotal).toBe(216);
  });

  it("matches the known sic-bo distribution", () => {
    expect(THEORY.sumCounts[3]).toBe(1);
    expect(THEORY.sumCounts[10]).toBe(27);
    expect(THEORY.sumCounts[11]).toBe(27);
    expect(THEORY.sumCounts[18]).toBe(1);

    expect(THEORY.outcomeCounts).toEqual({ big: 105, small: 105, triple: 6 });
    expect(THEORY.parityCounts).toEqual({ odd: 108, even: 108 });
    expect(THEORY.patternCounts).toEqual({ double: 90, triple: 6, straight: 24 });
  });

  it("derives rates, mean and standard deviation", () => {
    expect(THEORY.outcomeRates.triple).toBeCloseTo(6 / 216, 10);
    expect(THEORY.parityRates.odd).toBe(0.5);
    expect(THEORY.faceRate).toBeCloseTo(1 / 6, 10);
    expect(THEORY.meanSum).toBeCloseTo(10.5, 10);
    expect(THEORY.stdDevSum).toBeCloseTo(Math.sqrt(105 / 12), 10);
    expect(THEORY.bucketRates.low + THEORY.bucketRates.midLow).toBeCloseTo(0.5, 10);
  });

  it("buckets sums and builds blank maps", () => {
    expect(bucketOf(3)).toBe("low");
    expect(bucketOf(9)).toBe("midLow");
    expect(bucketOf(11)).toBe("midHigh");
    expect(bucketOf(18)).toBe("high");
    expect(SUM_BUCKETS).toHaveLength(4);

    expect(buildSumMap()[3]).toBe(0);
    expect(buildSumMap(null)[18]).toBeNull();
    expect(buildBucketMap()).toEqual({ low: 0, midLow: 0, midHigh: 0, high: 0 });
    expect(buildBucketMap(null).low).toBeNull();
  });
});
