export const DICE_MIN = 1;
export const DICE_MAX = 6;

const SUM_MIN = 3;
const SUM_MAX = 18;

function isValidDie(value) {
  return Number.isInteger(value) && value >= DICE_MIN && value <= DICE_MAX;
}

function cloneRound(round) {
  return {
    first: round.first,
    second: round.second,
    third: round.third,
    stage: round.stage,
  };
}

export function isRoundComplete(round) {
  return (
    round &&
    round.stage === 3 &&
    isValidDie(round.first) &&
    isValidDie(round.second) &&
    isValidDie(round.third)
  );
}

export function sanitizeHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  const history = [];

  rawHistory.forEach((rawRound) => {
    if (!rawRound || typeof rawRound !== "object") {
      return;
    }

    const first = Number(rawRound.first);
    const second = Number(rawRound.second);
    const third = Number(rawRound.third);

    if (!isValidDie(first)) {
      return;
    }

    if (isValidDie(second) && isValidDie(third)) {
      history.push({ first, second, third, stage: 3 });
      return;
    }

    if (isValidDie(second)) {
      history.push({ first, second, stage: 2 });
      return;
    }

    history.push({ first, stage: 1 });
  });

  return history;
}

export function addRoll(history, value) {
  const roll = Number(value);
  if (!isValidDie(roll)) {
    throw new Error(`Die value must be ${DICE_MIN}-${DICE_MAX}`);
  }

  const next = history.map(cloneRound);
  const latest = next[next.length - 1];

  if (!latest || latest.stage === 3) {
    next.push({ first: roll, stage: 1 });
    return next;
  }

  if (latest.stage === 1) {
    latest.second = roll;
    latest.stage = 2;
    return next;
  }

  latest.third = roll;
  latest.stage = 3;
  return next;
}

export function undoLastRoll(history) {
  if (!history.length) {
    return [];
  }

  const next = history.map(cloneRound);
  const latest = next[next.length - 1];

  if (latest.stage === 1) {
    next.pop();
    return next;
  }

  if (latest.stage === 2) {
    delete latest.second;
    latest.stage = 1;
    return next;
  }

  delete latest.third;
  latest.stage = 2;
  return next;
}

export function getRoundResult(round) {
  if (!isRoundComplete(round)) {
    return null;
  }

  const { first, second, third } = round;
  const sum = first + second + third;
  const leopard = first === second && second === third;
  const sorted = [first, second, third].slice().sort((a, b) => a - b);
  const straight = sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2];

  const faceCounts = new Array(DICE_MAX).fill(0);
  faceCounts[first - 1] += 1;
  faceCounts[second - 1] += 1;
  faceCounts[third - 1] += 1;

  const pairFaces = [];
  faceCounts.forEach((count, index) => {
    if (count >= 2) {
      pairFaces.push(index + 1);
    }
  });

  return {
    sum,
    leopard,
    big: !leopard && sum > 10,
    small: !leopard && sum <= 10,
    odd: sum % 2 === 1,
    even: sum % 2 === 0,
    straight,
    pair: pairFaces.length > 0,
    pairFaces,
    faceCounts,
  };
}

function toRate(value, total) {
  if (!total) {
    return 0;
  }
  return value / total;
}

export function calculateStatistics(history) {
  const sanitized = sanitizeHistory(history);

  const faceCounts = new Array(DICE_MAX).fill(0);
  const roundHitCounts = new Array(DICE_MAX).fill(0);
  const sumCounts = {};
  const tripleCounts = new Array(DICE_MAX).fill(0);
  const pairFaceCounts = new Array(DICE_MAX).fill(0);

  for (let sum = SUM_MIN; sum <= SUM_MAX; sum += 1) {
    sumCounts[sum] = 0;
  }

  let completedRounds = 0;
  let big = 0;
  let small = 0;
  let leopard = 0;
  let odd = 0;
  let even = 0;
  let straight = 0;
  let pair = 0;

  sanitized.forEach((round) => {
    faceCounts[round.first - 1] += 1;
    if (round.stage >= 2) {
      faceCounts[round.second - 1] += 1;
    }
    if (round.stage === 3) {
      faceCounts[round.third - 1] += 1;
    }

    const result = getRoundResult(round);
    if (!result) {
      return;
    }

    completedRounds += 1;
    sumCounts[result.sum] += 1;

    if (result.big) {
      big += 1;
    }
    if (result.small) {
      small += 1;
    }
    if (result.leopard) {
      leopard += 1;
      tripleCounts[round.first - 1] += 1;
    }
    if (result.odd) {
      odd += 1;
    }
    if (result.even) {
      even += 1;
    }
    if (result.straight) {
      straight += 1;
    }
    if (result.pair) {
      pair += 1;
    }

    result.pairFaces.forEach((face) => {
      pairFaceCounts[face - 1] += 1;
    });

    result.faceCounts.forEach((count, index) => {
      if (count > 0) {
        roundHitCounts[index] += 1;
      }
    });
  });

  const totalRolls = faceCounts.reduce((sum, count) => sum + count, 0);
  const inProgressRounds = sanitized.filter((round) => round.stage !== 3).length;

  return {
    meta: {
      totalRolls,
      completedRounds,
      inProgressRounds,
      canUndo: sanitized.length > 0,
    },
    faces: {
      counts: faceCounts,
      rates: faceCounts.map((count) => toRate(count, totalRolls)),
      roundHitCounts,
      roundHitRates: roundHitCounts.map((count) => toRate(count, completedRounds)),
    },
    outcomes: {
      big,
      small,
      leopard,
      odd,
      even,
      straight,
      pair,
      bigRate: toRate(big, completedRounds),
      smallRate: toRate(small, completedRounds),
      leopardRate: toRate(leopard, completedRounds),
      oddRate: toRate(odd, completedRounds),
      evenRate: toRate(even, completedRounds),
      straightRate: toRate(straight, completedRounds),
      pairRate: toRate(pair, completedRounds),
    },
    sums: {
      counts: sumCounts,
      rates: Object.fromEntries(
        Object.entries(sumCounts).map(([sum, count]) => [sum, toRate(count, completedRounds)]),
      ),
    },
    triples: {
      counts: tripleCounts,
      total: leopard,
      rates: tripleCounts.map((count) => toRate(count, completedRounds)),
    },
    pairFaces: {
      counts: pairFaceCounts,
      rates: pairFaceCounts.map((count) => toRate(count, completedRounds)),
    },
  };
}
