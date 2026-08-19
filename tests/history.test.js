import { describe, expect, it } from "vitest";

import {
  addRoll,
  cloneRound,
  getAllRolls,
  getCompletedRounds,
  getRoundEnd,
  getRoundStart,
  getStampsOf,
  isRoundComplete,
  normalizeHistory,
  normalizeRound,
  undoLastRoll,
} from "../src/history.js";

describe("history normalization", () => {
  it("normalizes rounds from modern and legacy formats", () => {
    expect(normalizeRound(null)).toBeNull();
    expect(normalizeRound("nope")).toBeNull();
    expect(normalizeRound({ rolls: [1, 2, 7, 3] })).toEqual({ rolls: [1, 2, 3] });
    expect(normalizeRound({ rolls: [0, 7, "bad"] })).toBeNull();
    expect(normalizeRound({ first: 6, second: "5", third: 4, stage: 3 })).toEqual({
      rolls: [6, 5, 4],
    });
    expect(normalizeRound({ rolls: [1, 2, 3, 4] })).toEqual({ rolls: [1, 2, 3] });
  });

  it("keeps valid timestamps and drops invalid ones", () => {
    expect(normalizeRound({ rolls: [1, 2], at: [100, 200] })).toEqual({
      rolls: [1, 2],
      at: [100, 200],
    });
    expect(normalizeRound({ rolls: [1, 2], at: [0, "x"] })).toEqual({ rolls: [1, 2] });
    expect(normalizeRound({ rolls: [1, 2], at: "nope" })).toEqual({ rolls: [1, 2] });
    expect(normalizeRound({ rolls: [1, 2], at: [null, 400] })).toEqual({
      rolls: [1, 2],
      at: [null, 400],
    });
    expect(normalizeRound({ first: 1, second: 2, third: 3, at: [10, 20, 30] })).toEqual({
      rolls: [1, 2, 3],
      at: [10, 20, 30],
    });
  });

  it("normalizes history and drops invalid entries", () => {
    const input = [{ rolls: [1, 2, 3] }, { first: "x", second: 2 }, { first: 4 }, "bad"];
    expect(normalizeHistory(input)).toEqual([{ rolls: [1, 2, 3] }, { rolls: [2] }, { rolls: [4] }]);
    expect(normalizeHistory("not-array")).toEqual([]);
    expect(normalizeHistory(null)).toEqual([]);
  });

  it("clones rounds with and without timestamps", () => {
    expect(cloneRound({ rolls: [1, 2] })).toEqual({ rolls: [1, 2] });

    const source = { rolls: [1, 2], at: [10, 20] };
    const clone = cloneRound(source);
    clone.at.push(30);
    expect(source.at).toEqual([10, 20]);
  });
});

describe("history mutation helpers", () => {
  it("adds rolls and creates rounds of three", () => {
    const initial = [];
    const step1 = addRoll(initial, 1);
    const step2 = addRoll(step1, 2);
    const step3 = addRoll(step2, 3);
    const step4 = addRoll(step3, 4);

    expect(initial).toEqual([]);
    expect(step3).toEqual([{ rolls: [1, 2, 3] }]);
    expect(step4).toEqual([{ rolls: [1, 2, 3] }, { rolls: [4] }]);
    expect(() => addRoll(step4, 9)).toThrow("Die value must be an integer between 1 and 6.");
  });

  it("records timestamps when provided", () => {
    const step1 = addRoll([], 1, 1000);
    const step2 = addRoll(step1, 2, 2000);
    const step3 = addRoll(step2, 3, 3000);
    const step4 = addRoll(step3, 4, 4000);

    expect(step3).toEqual([{ rolls: [1, 2, 3], at: [1000, 2000, 3000] }]);
    expect(step4[1]).toEqual({ rolls: [4], at: [4000] });
  });

  it("backfills timestamps for legacy rounds", () => {
    const legacy = [{ rolls: [1, 2] }];
    const updated = addRoll(legacy, 3, 5000);
    expect(updated).toEqual([{ rolls: [1, 2, 3], at: [null, null, 5000] }]);
  });

  it("keeps timestamp slots aligned when a stamp is missing", () => {
    const withStamps = addRoll([], 1, 1000);
    const updated = addRoll(withStamps, 2);
    expect(updated).toEqual([{ rolls: [1, 2], at: [1000, null] }]);
  });

  it("undoes latest roll while preserving previous rounds", () => {
    const history = [{ rolls: [1, 2, 3] }, { rolls: [4, 5] }];
    const undoOnce = undoLastRoll(history);
    const undoTwice = undoLastRoll(undoOnce);
    const undoThrice = undoLastRoll(undoTwice);
    const undoFourth = undoLastRoll(undoThrice);
    const undoFifth = undoLastRoll(undoFourth);

    expect(undoLastRoll([])).toEqual([]);
    expect(undoOnce).toEqual([{ rolls: [1, 2, 3] }, { rolls: [4] }]);
    expect(undoTwice).toEqual([{ rolls: [1, 2, 3] }]);
    expect(undoThrice).toEqual([{ rolls: [1, 2] }]);
    expect(undoFourth).toEqual([{ rolls: [1] }]);
    expect(undoFifth).toEqual([]);
    expect(history).toEqual([{ rolls: [1, 2, 3] }, { rolls: [4, 5] }]);
  });

  it("trims timestamps on undo", () => {
    const history = [{ rolls: [1, 2, 3], at: [10, 20, 30] }];
    expect(undoLastRoll(history)).toEqual([{ rolls: [1, 2], at: [10, 20] }]);
  });

  it("returns completed rounds and flattened roll list", () => {
    const history = [{ rolls: [1, 2, 3] }, { rolls: [4, 5] }, { rolls: [6, 6, 6] }];
    expect(isRoundComplete(history[0])).toBe(true);
    expect(isRoundComplete(history[1])).toBe(false);
    expect(isRoundComplete(null)).toBe(false);
    expect(getCompletedRounds(history)).toEqual([{ rolls: [1, 2, 3] }, { rolls: [6, 6, 6] }]);
    expect(getAllRolls(history)).toEqual([1, 2, 3, 4, 5, 6, 6, 6]);
  });
});

describe("timestamp accessors", () => {
  it("reads round boundaries", () => {
    const round = { rolls: [1, 2, 3], at: [null, 200, 300] };
    expect(getStampsOf(round)).toEqual([null, 200, 300]);
    expect(getRoundStart(round)).toBe(200);
    expect(getRoundEnd(round)).toBe(300);

    const bare = { rolls: [1] };
    expect(getStampsOf(bare)).toEqual([]);
    expect(getRoundStart(bare)).toBeNull();
    expect(getRoundEnd(bare)).toBeNull();
  });
});
