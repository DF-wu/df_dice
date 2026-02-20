import { getAllRolls, getCompletedRounds } from "./history.js";

const SUM_MIN = 3;
const SUM_MAX = 18;
const FACE_COUNT = 6;

function buildCountMap(start, end) {
  const map = {};
  for (let value = start; value <= end; value += 1) {
    map[value] = 0;
  }
  return map;
}

function toRate(count, total) {
  if (total === 0) {
    return 0;
  }
  return count / total;
}

function isStraight(rolls) {
  const sorted = [...rolls].sort((a, b) => a - b);
  return sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2];
}

function getHotAndColdNumbers(faceCounts, totalRolls) {
  if (totalRolls === 0) {
    return {
      hotNumbers: [],
      coldNumbers: [],
    };
  }

  const maxCount = Math.max(...faceCounts);
  const minCount = Math.min(...faceCounts);

  const hotNumbers = [];
  const coldNumbers = [];

  for (let index = 0; index < FACE_COUNT; index += 1) {
    if (faceCounts[index] === maxCount) {
      hotNumbers.push(index + 1);
    }
    if (faceCounts[index] === minCount) {
      coldNumbers.push(index + 1);
    }
  }

  return { hotNumbers, coldNumbers };
}

function getBigSmallStreak(analyses) {
  let currentType = null;
  let currentLength = 0;
  let longestBig = 0;
  let longestSmall = 0;

  for (const entry of analyses) {
    if (!entry.sizeType) {
      currentType = null;
      currentLength = 0;
      continue;
    }

    if (entry.sizeType === currentType) {
      currentLength += 1;
    } else {
      currentType = entry.sizeType;
      currentLength = 1;
    }

    if (entry.sizeType === "big") {
      longestBig = Math.max(longestBig, currentLength);
    }

    if (entry.sizeType === "small") {
      longestSmall = Math.max(longestSmall, currentLength);
    }
  }

  return {
    currentType,
    currentLength,
    longestBig,
    longestSmall,
  };
}

export function analyzeCompletedRound(round) {
  if (!round || !Array.isArray(round.rolls) || round.rolls.length !== 3) {
    throw new Error("A completed round requires exactly 3 rolls.");
  }

  const [first, second, third] = round.rolls;
  const sum = first + second + third;
  const triple = first === second && second === third;
  const uniqueCount = new Set(round.rolls).size;
  const double = uniqueCount === 2;

  return {
    sum,
    triple,
    double,
    straight: uniqueCount === 3 && isStraight(round.rolls),
    parity: sum % 2 === 0 ? "even" : "odd",
    sizeType: triple ? null : sum > 10 ? "big" : "small",
  };
}

export function calculateStatistics(history) {
  const allRolls = getAllRolls(history);
  const completedRounds = getCompletedRounds(history);
  const totalRolls = allRolls.length;
  const completedCount = completedRounds.length;

  const faceCounts = Array.from({ length: FACE_COUNT }, () => 0);
  for (const value of allRolls) {
    faceCounts[value - 1] += 1;
  }

  const faceRates = faceCounts.map((count) => toRate(count, totalRolls));

  const outcomeCounts = { big: 0, small: 0, triple: 0 };
  const parityCounts = { odd: 0, even: 0 };
  const patternCounts = { double: 0, triple: 0, straight: 0 };
  const sumCounts = buildCountMap(SUM_MIN, SUM_MAX);
  const recentOutcomes = [];
  const analyzedRounds = completedRounds.map(analyzeCompletedRound);

  for (const round of analyzedRounds) {
    sumCounts[round.sum] += 1;
    parityCounts[round.parity] += 1;

    if (round.triple) {
      outcomeCounts.triple += 1;
      patternCounts.triple += 1;
      recentOutcomes.push("triple");
    } else {
      outcomeCounts[round.sizeType] += 1;
      recentOutcomes.push(round.sizeType);
    }

    if (round.double) {
      patternCounts.double += 1;
    }

    if (round.straight) {
      patternCounts.straight += 1;
    }
  }

  const sumRates = buildCountMap(SUM_MIN, SUM_MAX);
  for (let sum = SUM_MIN; sum <= SUM_MAX; sum += 1) {
    sumRates[sum] = toRate(sumCounts[sum], completedCount);
  }

  const outcomeRates = {
    big: toRate(outcomeCounts.big, completedCount),
    small: toRate(outcomeCounts.small, completedCount),
    triple: toRate(outcomeCounts.triple, completedCount),
  };

  const parityRates = {
    odd: toRate(parityCounts.odd, completedCount),
    even: toRate(parityCounts.even, completedCount),
  };

  const patternRates = {
    double: toRate(patternCounts.double, completedCount),
    triple: toRate(patternCounts.triple, completedCount),
    straight: toRate(patternCounts.straight, completedCount),
  };

  const sumTotal = analyzedRounds.reduce((accumulator, round) => accumulator + round.sum, 0);
  const averageSum = completedCount === 0 ? 0 : sumTotal / completedCount;
  const streak = getBigSmallStreak(analyzedRounds);
  const roundsInProgressRolls = totalRolls - completedCount * 3;
  const { hotNumbers, coldNumbers } = getHotAndColdNumbers(faceCounts, totalRolls);

  return {
    totalRolls,
    totalRounds: Math.ceil(totalRolls / 3),
    completedRounds: completedCount,
    inProgressRolls: roundsInProgressRolls,
    averageSum,
    faceCounts,
    faceRates,
    outcomeCounts,
    outcomeRates,
    parityCounts,
    parityRates,
    patternCounts,
    patternRates,
    sumCounts,
    sumRates,
    streak,
    hotNumbers,
    coldNumbers,
    recentOutcomes: recentOutcomes.slice(-10),
  };
}
