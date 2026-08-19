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

function toValidStamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
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

function withStamps(round, stamps) {
  if (stamps.some((stamp) => stamp !== null)) {
    return { ...round, at: stamps };
  }
  return round;
}

export function cloneRound(round) {
  const clone = { rolls: [...round.rolls] };
  if (round.at) {
    clone.at = [...round.at];
  }
  return clone;
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

  const rolls = [];
  const stamps = [];
  const rawStamps = Array.isArray(round.at) ? round.at : [];

  if (Array.isArray(round.rolls)) {
    for (let index = 0; index < round.rolls.length; index += 1) {
      const roll = toValidRoll(round.rolls[index]);
      if (roll === null) {
        continue;
      }
      rolls.push(roll);
      stamps.push(toValidStamp(rawStamps[index]));
      if (rolls.length === ROUND_SIZE) {
        break;
      }
    }
  } else {
    rolls.push(...toLegacyRolls(round));
    for (let index = 0; index < rolls.length; index += 1) {
      stamps.push(toValidStamp(rawStamps[index]));
    }
  }

  if (rolls.length === 0) {
    return null;
  }

  return withStamps({ rolls }, stamps);
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

function pushStamp(round, stamp) {
  if (stamp === null && !round.at) {
    return;
  }

  const stamps = round.at ? [...round.at] : [];
  while (stamps.length < round.rolls.length - 1) {
    stamps.push(null);
  }
  stamps.push(stamp);
  round.at = stamps;
}

export function addRoll(history, value, timestamp = null) {
  const roll = assertValidRoll(value);
  const stamp = toValidStamp(timestamp);
  const updated = normalizeHistory(history).map(cloneRound);
  const latestRound = updated[updated.length - 1];

  if (!latestRound || isRoundComplete(latestRound)) {
    const created = { rolls: [roll] };
    pushStamp(created, stamp);
    updated.push(created);
    return updated;
  }

  latestRound.rolls.push(roll);
  pushStamp(latestRound, stamp);
  return updated;
}

export function undoLastRoll(history) {
  const updated = normalizeHistory(history).map(cloneRound);
  if (updated.length === 0) {
    return [];
  }

  const latestRound = updated[updated.length - 1];

  if (latestRound.rolls.length <= 1) {
    updated.pop();
    return updated;
  }

  latestRound.rolls = latestRound.rolls.slice(0, -1);
  if (latestRound.at) {
    latestRound.at = latestRound.at.slice(0, -1);
  }

  return updated;
}

export function getCompletedRounds(history) {
  return normalizeHistory(history).filter(isRoundComplete);
}

export function getAllRolls(history) {
  return normalizeHistory(history).flatMap((round) => round.rolls);
}

export function getStampsOf(round) {
  return round.at ?? [];
}

export function getRoundStart(round) {
  const stamps = getStampsOf(round).filter((stamp) => stamp !== null);
  return stamps.length === 0 ? null : stamps[0];
}

export function getRoundEnd(round) {
  const stamps = getStampsOf(round).filter((stamp) => stamp !== null);
  return stamps.length === 0 ? null : stamps[stamps.length - 1];
}
