export const ROUND_SIZE = 3;
export const DIE_MIN = 1;
export const DIE_MAX = 6;

function toValidRoll(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < DIE_MIN || number > DIE_MAX) {
    return null;
  }
  return number;
}

function assertValidRoll(value) {
  const roll = toValidRoll(value);
  if (roll === null) {
    throw new Error("Die value must be an integer between 1 and 6.");
  }
  return roll;
}

function cloneRound(round) {
  return { rolls: [...round.rolls] };
}

function toLegacyRolls(round) {
  const values = [round.first, round.second, round.third];
  const rolls = [];

  for (const value of values) {
    const roll = toValidRoll(value);
    if (roll === null) {
      continue;
    }
    rolls.push(roll);
    if (rolls.length === ROUND_SIZE) {
      break;
    }
  }

  return rolls;
}

export function normalizeRound(round) {
  if (!round || typeof round !== "object") {
    return null;
  }

  let rolls = [];

  if (Array.isArray(round.rolls)) {
    for (const value of round.rolls) {
      const roll = toValidRoll(value);
      if (roll === null) {
        continue;
      }
      rolls.push(roll);
      if (rolls.length === ROUND_SIZE) {
        break;
      }
    }
  } else {
    rolls = toLegacyRolls(round);
  }

  if (rolls.length === 0) {
    return null;
  }

  return { rolls };
}

export function normalizeHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  const rounds = [];
  for (const entry of rawHistory) {
    const round = normalizeRound(entry);
    if (round) {
      rounds.push(round);
    }
  }

  return rounds;
}

export function isRoundComplete(round) {
  return Array.isArray(round?.rolls) && round.rolls.length === ROUND_SIZE;
}

export function addRoll(history, value) {
  const roll = assertValidRoll(value);
  const normalized = normalizeHistory(history);
  const updated = normalized.map(cloneRound);
  const latestRound = updated[updated.length - 1];

  if (!latestRound || isRoundComplete(latestRound)) {
    updated.push({ rolls: [roll] });
    return updated;
  }

  latestRound.rolls.push(roll);
  return updated;
}

export function undoLastRoll(history) {
  const normalized = normalizeHistory(history);
  if (normalized.length === 0) {
    return [];
  }

  const updated = normalized.map(cloneRound);
  const latestRound = updated[updated.length - 1];

  if (latestRound.rolls.length <= 1) {
    updated.pop();
  } else {
    latestRound.rolls = latestRound.rolls.slice(0, -1);
  }

  return updated;
}

export function getCompletedRounds(history) {
  return normalizeHistory(history).filter(isRoundComplete);
}

export function getAllRolls(history) {
  return normalizeHistory(history).flatMap((round) => round.rolls);
}
