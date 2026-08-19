import {
  getAllRolls,
  getCompletedRounds,
  getRoundEnd,
  getRoundStart,
  getStampsOf,
  isRoundComplete,
  normalizeHistory,
  ROUND_SIZE,
} from "./history.js";
import { analyzeRolls, outcomeOf } from "./round.js";
import {
  bucketOf,
  buildBucketMap,
  buildSumMap,
  FACE_COUNT,
  SUM_BUCKETS,
  SUM_MAX,
  SUM_MIN,
  THEORY,
} from "./theory.js";

const RECENT_LIMIT = 10;
const MOVING_AVERAGE_WINDOW = 5;

function toRate(count, total) {
  if (total === 0) {
    return 0;
  }
  return count / total;
}

function zeros(length) {
  return Array.from({ length }, () => 0);
}

function roundsSince(entries, predicate) {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (predicate(entries[index])) {
      return entries.length - 1 - index;
    }
  }
  return null;
}

function getHotAndColdNumbers(faceCounts, totalRolls) {
  if (totalRolls === 0) {
    return { hotNumbers: [], coldNumbers: [] };
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

  return { currentType, currentLength, longestBig, longestSmall };
}

function trackStreak(values) {
  let currentValue = null;
  let currentLength = 0;
  const longest = {};

  for (const value of values) {
    if (value === currentValue) {
      currentLength += 1;
    } else {
      currentValue = value;
      currentLength = 1;
    }
    longest[value] = Math.max(longest[value] ?? 0, currentLength);
  }

  return { currentValue, currentLength, longest };
}

function countSwitches(values) {
  let switches = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] !== values[index - 1]) {
      switches += 1;
    }
  }
  return switches;
}

function describeSpread(values) {
  if (values.length === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: null, max: null, range: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;

  return {
    mean,
    median,
    stdDev: Math.sqrt(variance),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    range: sorted[sorted.length - 1] - sorted[0],
  };
}

function movingAverage(values, window) {
  const averages = [];
  for (let index = 0; index < values.length; index += 1) {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    averages.push(slice.reduce((total, value) => total + value, 0) / slice.length);
  }
  return averages;
}

function chiSquareOfFaces(faceCounts, totalRolls) {
  const expected = totalRolls / FACE_COUNT;
  if (totalRolls === 0) {
    return { value: 0, expected: 0, degreesOfFreedom: FACE_COUNT - 1, verdict: "waiting" };
  }

  let value = 0;
  for (const count of faceCounts) {
    value += (count - expected) ** 2 / expected;
  }

  // 5 degrees of freedom: 11.07 (p=0.05), 15.09 (p=0.01)
  const verdict = totalRolls < 30 ? "waiting" : value > 15.09 ? "biased" : value > 11.07 ? "watch" : "fair";
  return { value, expected, degreesOfFreedom: FACE_COUNT - 1, verdict };
}

function describeTiming(rounds) {
  const stamps = [];
  for (const round of rounds) {
    for (const stamp of getStampsOf(round)) {
      if (stamp !== null) {
        stamps.push(stamp);
      }
    }
  }

  if (stamps.length < 2) {
    return null;
  }

  const firstAt = stamps[0];
  const lastAt = stamps[stamps.length - 1];
  const elapsedMs = lastAt - firstAt;
  const averageRollMs = elapsedMs / (stamps.length - 1);

  return {
    firstAt,
    lastAt,
    elapsedMs,
    trackedRolls: stamps.length,
    averageRollMs,
    averageRoundMs: averageRollMs * ROUND_SIZE,
  };
}

function buildRoundRecords(rounds) {
  return rounds.map((round, index) => {
    const complete = isRoundComplete(round);
    const analysis = complete ? analyzeRolls(round.rolls) : null;

    return {
      index: index + 1,
      rolls: [...round.rolls],
      complete,
      analysis,
      outcome: complete ? outcomeOf(analysis) : null,
      startedAt: getRoundStart(round),
      endedAt: getRoundEnd(round),
    };
  });
}

export function analyzeCompletedRound(round) {
  if (!round || !Array.isArray(round.rolls) || round.rolls.length !== ROUND_SIZE) {
    throw new Error("A completed round requires exactly 3 rolls.");
  }
  return analyzeRolls(round.rolls);
}

export function calculateStatistics(history) {
  const rounds = normalizeHistory(history);
  const allRolls = getAllRolls(rounds);
  const completedRounds = getCompletedRounds(rounds);
  const totalRolls = allRolls.length;
  const completedCount = completedRounds.length;

  const faceCounts = zeros(FACE_COUNT);
  const positionCounts = Array.from({ length: ROUND_SIZE }, () => zeros(FACE_COUNT));
  for (const round of rounds) {
    round.rolls.forEach((value, position) => {
      faceCounts[value - 1] += 1;
      positionCounts[position][value - 1] += 1;
    });
  }

  const faceRates = faceCounts.map((count) => toRate(count, totalRolls));

  const outcomeCounts = { big: 0, small: 0, triple: 0 };
  const parityCounts = { odd: 0, even: 0 };
  const patternCounts = { double: 0, triple: 0, straight: 0 };
  const sumCounts = buildSumMap();
  const bucketCounts = buildBucketMap();
  const tripleCounts = zeros(FACE_COUNT);
  const pairMatrix = Array.from({ length: FACE_COUNT }, () => zeros(FACE_COUNT));
  const outcomes = [];
  const parities = [];
  const sumSeries = [];
  const analyzedRounds = completedRounds.map(analyzeCompletedRound);

  completedRounds.forEach((round, index) => {
    const analysis = analyzedRounds[index];
    sumCounts[analysis.sum] += 1;
    bucketCounts[bucketOf(analysis.sum)] += 1;
    parityCounts[analysis.parity] += 1;
    parities.push(analysis.parity);
    sumSeries.push(analysis.sum);
    outcomes.push(outcomeOf(analysis));
    outcomeCounts[outcomeOf(analysis)] += 1;

    if (analysis.triple) {
      patternCounts.triple += 1;
      tripleCounts[round.rolls[0] - 1] += 1;
    }
    if (analysis.double) {
      patternCounts.double += 1;
    }
    if (analysis.straight) {
      patternCounts.straight += 1;
    }

    for (let left = 0; left < ROUND_SIZE; left += 1) {
      for (let right = left + 1; right < ROUND_SIZE; right += 1) {
        const a = round.rolls[left] - 1;
        const b = round.rolls[right] - 1;
        pairMatrix[a][b] += 1;
        if (a !== b) {
          pairMatrix[b][a] += 1;
        }
      }
    }
  });

  const sumRates = buildSumMap();
  for (let sum = SUM_MIN; sum <= SUM_MAX; sum += 1) {
    sumRates[sum] = toRate(sumCounts[sum], completedCount);
  }

  const bucketRates = buildBucketMap();
  for (const bucket of SUM_BUCKETS) {
    bucketRates[bucket.key] = toRate(bucketCounts[bucket.key], completedCount);
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

  const spread = describeSpread(sumSeries);
  const streak = getBigSmallStreak(analyzedRounds);
  const outcomeStreak = trackStreak(outcomes);
  const parityStreak = trackStreak(parities);
  const sizeSeries = analyzedRounds
    .filter((analysis) => analysis.sizeType !== null)
    .map((analysis) => analysis.sizeType);
  const switches = countSwitches(sizeSeries);

  const gapsByFace = faceCounts.map((_count, index) =>
    roundsSince(completedRounds, (round) => round.rolls.includes(index + 1)),
  );
  const gapsBySum = buildSumMap(null);
  for (let sum = SUM_MIN; sum <= SUM_MAX; sum += 1) {
    gapsBySum[sum] = roundsSince(analyzedRounds, (analysis) => analysis.sum === sum);
  }

  const gaps = {
    big: roundsSince(outcomes, (value) => value === "big"),
    small: roundsSince(outcomes, (value) => value === "small"),
    triple: roundsSince(outcomes, (value) => value === "triple"),
    double: roundsSince(analyzedRounds, (analysis) => analysis.double),
    straight: roundsSince(analyzedRounds, (analysis) => analysis.straight),
    byFace: gapsByFace,
    bySum: gapsBySum,
  };

  const faceDeviation = faceCounts.map((count, index) => ({
    face: index + 1,
    count,
    rate: faceRates[index],
    expectedCount: totalRolls * THEORY.faceRate,
    deltaCount: count - totalRolls * THEORY.faceRate,
    deltaRate: faceRates[index] - THEORY.faceRate,
  }));

  const sortedSums = Object.entries(sumCounts)
    .map(([sum, count]) => ({ sum: Number(sum), count, rate: sumRates[sum] }))
    .sort((a, b) => b.count - a.count || a.sum - b.sum);

  const extremes = completedCount === 0 ? null : findExtremes(analyzedRounds);
  const { hotNumbers, coldNumbers } = getHotAndColdNumbers(faceCounts, totalRolls);

  return {
    totalRolls,
    totalRounds: Math.ceil(totalRolls / ROUND_SIZE),
    completedRounds: completedCount,
    inProgressRolls: totalRolls - completedCount * ROUND_SIZE,
    averageSum: completedCount === 0 ? 0 : spread.mean,
    faceCounts,
    faceRates,
    faceDeviation,
    positionCounts,
    pairMatrix,
    tripleCounts,
    outcomeCounts,
    outcomeRates,
    parityCounts,
    parityRates,
    patternCounts,
    patternRates,
    sumCounts,
    sumRates,
    bucketCounts,
    bucketRates,
    sumSeries,
    movingAverages: movingAverage(sumSeries, MOVING_AVERAGE_WINDOW),
    spread,
    extremes,
    topSums: sortedSums.slice(0, 3),
    rareSums: [...sortedSums].reverse().slice(0, 3),
    streak,
    outcomeStreak,
    parityStreak,
    switches,
    switchRate: toRate(switches, Math.max(sizeSeries.length - 1, 0)),
    gaps,
    chiSquare: chiSquareOfFaces(faceCounts, totalRolls),
    timing: describeTiming(rounds),
    roundRecords: buildRoundRecords(rounds),
    outcomes,
    hotNumbers,
    coldNumbers,
    recentOutcomes: outcomes.slice(-RECENT_LIMIT),
    theory: THEORY,
  };
}

function findExtremes(analyzedRounds) {
  let highest = { sum: -Infinity, index: 0 };
  let lowest = { sum: Infinity, index: 0 };

  analyzedRounds.forEach((analysis, index) => {
    if (analysis.sum > highest.sum) {
      highest = { sum: analysis.sum, index: index + 1 };
    }
    if (analysis.sum < lowest.sum) {
      lowest = { sum: analysis.sum, index: index + 1 };
    }
  });

  return { highest, lowest };
}
