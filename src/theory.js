import { DIE_MAX, DIE_MIN, ROUND_SIZE } from "./history.js";
import { analyzeRolls, outcomeOf } from "./round.js";

export const FACE_COUNT = DIE_MAX;
export const SUM_MIN = DIE_MIN * ROUND_SIZE;
export const SUM_MAX = DIE_MAX * ROUND_SIZE;
export const TOTAL_OUTCOMES = DIE_MAX ** ROUND_SIZE;

export const SUM_BUCKETS = [
  { key: "low", label: "3-6", min: 3, max: 6 },
  { key: "midLow", label: "7-10", min: 7, max: 10 },
  { key: "midHigh", label: "11-14", min: 11, max: 14 },
  { key: "high", label: "15-18", min: 15, max: 18 },
];

export function bucketOf(sum) {
  return SUM_BUCKETS.find((bucket) => sum >= bucket.min && sum <= bucket.max).key;
}

export function buildSumMap(initial = 0) {
  const map = {};
  for (let sum = SUM_MIN; sum <= SUM_MAX; sum += 1) {
    map[sum] = initial;
  }
  return map;
}

export function buildBucketMap(initial = 0) {
  const map = {};
  for (const bucket of SUM_BUCKETS) {
    map[bucket.key] = initial;
  }
  return map;
}

function enumerateOutcomes() {
  const combinations = [];
  for (let first = DIE_MIN; first <= DIE_MAX; first += 1) {
    for (let second = DIE_MIN; second <= DIE_MAX; second += 1) {
      for (let third = DIE_MIN; third <= DIE_MAX; third += 1) {
        combinations.push([first, second, third]);
      }
    }
  }
  return combinations;
}

function buildTheory() {
  const sumCounts = buildSumMap();
  const bucketCounts = buildBucketMap();
  const outcomeCounts = { big: 0, small: 0, triple: 0 };
  const parityCounts = { odd: 0, even: 0 };
  const patternCounts = { double: 0, triple: 0, straight: 0 };

  for (const rolls of enumerateOutcomes()) {
    const analysis = analyzeRolls(rolls);
    sumCounts[analysis.sum] += 1;
    bucketCounts[bucketOf(analysis.sum)] += 1;
    outcomeCounts[outcomeOf(analysis)] += 1;
    parityCounts[analysis.parity] += 1;

    if (analysis.double) {
      patternCounts.double += 1;
    }
    if (analysis.triple) {
      patternCounts.triple += 1;
    }
    if (analysis.straight) {
      patternCounts.straight += 1;
    }
  }

  const toRate = (count) => count / TOTAL_OUTCOMES;
  const mapRates = (counts) =>
    Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, toRate(count)]));

  const sumRates = mapRates(sumCounts);
  let mean = 0;
  for (const [sum, rate] of Object.entries(sumRates)) {
    mean += Number(sum) * rate;
  }

  let variance = 0;
  for (const [sum, rate] of Object.entries(sumRates)) {
    variance += (Number(sum) - mean) ** 2 * rate;
  }

  return {
    sumCounts,
    sumRates,
    bucketCounts,
    bucketRates: mapRates(bucketCounts),
    outcomeCounts,
    outcomeRates: mapRates(outcomeCounts),
    parityCounts,
    parityRates: mapRates(parityCounts),
    patternCounts,
    patternRates: mapRates(patternCounts),
    faceRate: 1 / FACE_COUNT,
    meanSum: mean,
    stdDevSum: Math.sqrt(variance),
  };
}

export const THEORY = buildTheory();
