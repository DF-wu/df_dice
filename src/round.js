import { ROUND_SIZE } from "./history.js";

export const BIG_THRESHOLD = 10;

export function isStraight(rolls) {
  const sorted = [...rolls].sort((a, b) => a - b);
  return sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2];
}

export function analyzeRolls(rolls) {
  const [first, second, third] = rolls;
  const sum = first + second + third;
  const triple = first === second && second === third;
  const uniqueCount = new Set(rolls).size;

  return {
    sum,
    triple,
    double: uniqueCount === 2,
    straight: uniqueCount === ROUND_SIZE && isStraight(rolls),
    parity: sum % 2 === 0 ? "even" : "odd",
    sizeType: triple ? null : sum > BIG_THRESHOLD ? "big" : "small",
  };
}

export function outcomeOf(analysis) {
  return analysis.triple ? "triple" : analysis.sizeType;
}
