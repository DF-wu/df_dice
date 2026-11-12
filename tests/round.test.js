import { describe, expect, it } from "vitest";

import { analyzeRolls, isStraight, outcomeOf } from "../src/round.js";

describe("isStraight", () => {
  it("detects consecutive values regardless of order", () => {
    expect(isStraight([3, 1, 2])).toBe(true);
    expect(isStraight([4, 6, 5])).toBe(true);
    expect(isStraight([1, 2, 4])).toBe(false);
    expect(isStraight([1, 1, 2])).toBe(false);
  });
});

describe("analyzeRolls", () => {
  it("classifies triples", () => {
    expect(analyzeRolls([4, 4, 4])).toEqual({
      sum: 12,
      triple: true,
      double: false,
      straight: false,
      parity: "even",
      sizeType: null,
    });
  });

  it("classifies doubles, straights, big and small", () => {
    expect(analyzeRolls([2, 2, 5])).toMatchObject({ double: true, sizeType: "small", sum: 9 });
    expect(analyzeRolls([4, 5, 6])).toMatchObject({ straight: true, sizeType: "big", sum: 15 });
    expect(analyzeRolls([1, 2, 3])).toMatchObject({ straight: true, sizeType: "small" });
    expect(analyzeRolls([6, 6, 5])).toMatchObject({ double: true, sizeType: "big", parity: "odd" });
  });

  it("uses 10 as the big threshold boundary", () => {
    expect(analyzeRolls([1, 3, 6]).sizeType).toBe("small");
    expect(analyzeRolls([1, 4, 6]).sizeType).toBe("big");
  });
});

describe("outcomeOf", () => {
  it("maps analyses to outcomes", () => {
    expect(outcomeOf(analyzeRolls([1, 1, 1]))).toBe("triple");
    expect(outcomeOf(analyzeRolls([6, 6, 5]))).toBe("big");
    expect(outcomeOf(analyzeRolls([1, 1, 2]))).toBe("small");
  });
});
