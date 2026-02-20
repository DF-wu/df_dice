import { describe, expect, it } from "vitest";

import {
  addRoll,
  getAllRolls,
  getCompletedRounds,
  isRoundComplete,
  normalizeHistory,
  normalizeRound,
  undoLastRoll,
} from "../src/history.js";

describe("history normalization", () => {
  it("normalizes rounds from modern and legacy formats", () => {
    expect(normalizeRound(null)).toBeNull();
    expect(normalizeRound({ rolls: [1, 2, 7, 3] })).toEqual({ rolls: [1, 2, 3] });
    expect(normalizeRound({ rolls: [0, 7, "bad"] })).toBeNull();
    expect(normalizeRound({ first: 6, second: "5", third: 4, stage: 3 })).toEqual({
      rolls: [6, 5, 4],
    });
  });

  it("normalizes history and drops invalid entries", () => {
    const input = [
      { rolls: [1, 2, 3] },
      { first: "x", second: 2 },
      { first: 4 },
      "bad",
    ];
    expect(normalizeHistory(input)).toEqual([{ rolls: [1, 2, 3] }, { rolls: [2] }, { rolls: [4] }]);
    expect(normalizeHistory("not-array")).toEqual([]);
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

  it("returns completed rounds and flattened roll list", () => {
    const history = [{ rolls: [1, 2, 3] }, { rolls: [4, 5] }, { rolls: [6, 6, 6] }];
    expect(isRoundComplete(history[0])).toBe(true);
    expect(isRoundComplete(history[1])).toBe(false);
    expect(getCompletedRounds(history)).toEqual([{ rolls: [1, 2, 3] }, { rolls: [6, 6, 6] }]);
    expect(getAllRolls(history)).toEqual([1, 2, 3, 4, 5, 6, 6, 6]);
  });
});
