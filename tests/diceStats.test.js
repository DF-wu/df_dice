import { describe, expect, it } from "vitest";
import {
  addRoll,
  calculateStatistics,
  getRoundResult,
  isRoundComplete,
  sanitizeHistory,
  undoLastRoll,
} from "../src/diceStats.js";

describe("diceStats", () => {
  it("sanitizes unknown storage payload", () => {
    expect(sanitizeHistory("oops")).toEqual([]);

    const history = sanitizeHistory([
      null,
      {},
      { first: 0, stage: 1 },
      { first: "2", stage: 1 },
      { first: "3", second: "4" },
      { first: "5", second: "6", third: "1" },
      { first: "1", second: "8", third: "2" },
    ]);

    expect(history).toEqual([
      { first: 2, stage: 1 },
      { first: 3, second: 4, stage: 2 },
      { first: 5, second: 6, third: 1, stage: 3 },
      { first: 1, stage: 1 },
    ]);
  });

  it("adds rolls by stage and starts a new round when previous one is complete", () => {
    let history = [];
    history = addRoll(history, 2);
    history = addRoll(history, 3);
    history = addRoll(history, 4);
    history = addRoll(history, 6);

    expect(history).toEqual([
      { first: 2, second: 3, third: 4, stage: 3 },
      { first: 6, stage: 1 },
    ]);
  });

  it("throws when adding invalid dice values", () => {
    expect(() => addRoll([], 0)).toThrow("Die value must be 1-6");
    expect(() => addRoll([], 7)).toThrow("Die value must be 1-6");
  });

  it("undoes latest roll correctly for all stages", () => {
    expect(undoLastRoll([])).toEqual([]);

    const stage1 = [{ first: 1, stage: 1 }];
    expect(undoLastRoll(stage1)).toEqual([]);

    const stage2 = [{ first: 1, second: 2, stage: 2 }];
    expect(undoLastRoll(stage2)).toEqual([{ first: 1, stage: 1 }]);

    const stage3 = [{ first: 1, second: 2, third: 3, stage: 3 }];
    expect(undoLastRoll(stage3)).toEqual([{ first: 1, second: 2, stage: 2 }]);
  });

  it("computes round result details", () => {
    const leopard = getRoundResult({ first: 4, second: 4, third: 4, stage: 3 });
    expect(leopard).toMatchObject({
      sum: 12,
      leopard: true,
      big: false,
      small: false,
      odd: false,
      even: true,
      straight: false,
      pair: true,
      pairFaces: [4],
    });

    const straight = getRoundResult({ first: 2, second: 3, third: 4, stage: 3 });
    expect(straight).toMatchObject({
      sum: 9,
      leopard: false,
      big: false,
      small: true,
      odd: true,
      even: false,
      straight: true,
      pair: false,
      pairFaces: [],
    });

    expect(getRoundResult({ first: 2, stage: 1 })).toBeNull();
  });

  it("knows when a round is complete", () => {
    expect(isRoundComplete({ first: 1, second: 2, third: 3, stage: 3 })).toBe(true);
    expect(isRoundComplete({ first: 1, second: 2, stage: 2 })).toBe(false);
  });

  it("calculates full statistics and rates", () => {
    const stats = calculateStatistics([
      { first: 1, second: 1, third: 1, stage: 3 },
      { first: 6, second: 5, third: 4, stage: 3 },
      { first: 2, second: 2, third: 5, stage: 3 },
      { first: 3, second: 4, third: 5, stage: 3 },
      { first: 6, stage: 1 },
    ]);

    expect(stats.meta).toEqual({
      totalRolls: 13,
      completedRounds: 4,
      inProgressRounds: 1,
      canUndo: true,
    });

    expect(stats.faces.counts).toEqual([3, 2, 1, 2, 3, 2]);
    expect(stats.faces.roundHitCounts).toEqual([1, 1, 1, 2, 3, 1]);

    expect(stats.outcomes).toMatchObject({
      big: 2,
      small: 1,
      leopard: 1,
      odd: 3,
      even: 1,
      straight: 2,
      pair: 2,
    });

    expect(stats.sums.counts[3]).toBe(1);
    expect(stats.sums.counts[9]).toBe(1);
    expect(stats.sums.counts[12]).toBe(1);
    expect(stats.sums.counts[15]).toBe(1);
    expect(stats.sums.counts[4]).toBe(0);

    expect(stats.triples.counts).toEqual([1, 0, 0, 0, 0, 0]);
    expect(stats.pairFaces.counts).toEqual([1, 1, 0, 0, 0, 0]);

    expect(stats.outcomes.bigRate).toBe(0.5);
    expect(stats.outcomes.leopardRate).toBe(0.25);
    expect(stats.faces.rates[0]).toBe(3 / 13);
    expect(stats.sums.rates[12]).toBe(0.25);
  });

  it("returns zero rates when there is no data", () => {
    const stats = calculateStatistics([]);
    expect(stats.meta).toEqual({
      totalRolls: 0,
      completedRounds: 0,
      inProgressRounds: 0,
      canUndo: false,
    });
    expect(stats.faces.rates.every((rate) => rate === 0)).toBe(true);
    expect(stats.outcomes.bigRate).toBe(0);
    expect(stats.sums.rates[10]).toBe(0);
  });
});
