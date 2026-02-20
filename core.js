export const DICE_FACES = 6;
export const DICE_PER_ROUND = 3;
export const THEORETICAL_OUTCOMES = 216;

export function sumDice(dice) {
  return dice[0] + dice[1] + dice[2];
}

export function toMultisetKey(dice) {
  const sorted = [...dice].sort((a, b) => a - b);
  return `${sorted[0]}-${sorted[1]}-${sorted[2]}`;
}

export function countFaces(dice) {
  const counts = Array.from({ length: DICE_FACES }, () => 0);
  for (const face of dice) {
    if (!Number.isInteger(face) || face < 1 || face > DICE_FACES) {
      throw new Error(`invalid face: ${face}`);
    }
    counts[face - 1] += 1;
  }
  return counts;
}

export function isTriple(dice) {
  return dice[0] === dice[1] && dice[1] === dice[2];
}

export function hasAnyDouble(dice) {
  const counts = countFaces(dice);
  return counts.some((c) => c >= 2);
}

export function classifyRound(dice) {
  const sum = sumDice(dice);
  if (isTriple(dice)) {
    const face = dice[0];
    return {
      type: "triple",
      sum,
      face,
      label: `豹子 ${face} (${face}-${face}-${face}) ${sum}`,
    };
  }
  if (sum >= 11) {
    return { type: "big", sum, label: `大 ${sum}` };
  }
  return { type: "small", sum, label: `小 ${sum}` };
}

export function classifyOddEven(dice) {
  if (isTriple(dice)) return { type: "none", label: "(豹子不計)" };
  const sum = sumDice(dice);
  if (sum % 2 === 0) return { type: "even", label: `雙 ${sum}` };
  return { type: "odd", label: `單 ${sum}` };
}

export function buildTheoretical() {
  const sumCounts = Array.from({ length: 19 }, () => 0);
  const faceCounts = Array.from({ length: DICE_FACES }, () => 0);
  const faceCountsByPos = Array.from({ length: DICE_PER_ROUND }, () =>
    Array.from({ length: DICE_FACES }, () => 0),
  );
  const tripleByFace = Array.from({ length: DICE_FACES }, () => 0);
  const doubleByFace = Array.from({ length: DICE_FACES }, () => 0);

  let big = 0;
  let small = 0;
  let triple = 0;
  let odd = 0;
  let even = 0;

  // pattern categories
  let distinct = 0;
  let pair = 0;

  for (let a = 1; a <= DICE_FACES; a++) {
    for (let b = 1; b <= DICE_FACES; b++) {
      for (let c = 1; c <= DICE_FACES; c++) {
        const dice = /** @type {[number, number, number]} */ ([a, b, c]);
        faceCounts[a - 1]++;
        faceCounts[b - 1]++;
        faceCounts[c - 1]++;

        faceCountsByPos[0][a - 1]++;
        faceCountsByPos[1][b - 1]++;
        faceCountsByPos[2][c - 1]++;

        const sum = a + b + c;
        sumCounts[sum]++;

        const counts = countFaces(dice);
        const hasDouble = counts.some((x) => x >= 2);
        if (hasDouble) {
          for (let face = 1; face <= DICE_FACES; face++) {
            if (counts[face - 1] >= 2) doubleByFace[face - 1]++;
          }
        }

        if (isTriple(dice)) {
          triple++;
          tripleByFace[a - 1]++;
        } else if (sum >= 11) {
          big++;
        } else {
          small++;
        }

        if (isTriple(dice)) {
          // odd/even does not count triple in common rules
        } else if (sum % 2 === 0) {
          even++;
        } else {
          odd++;
        }

        if (isTriple(dice)) {
          // already counted
        } else if (hasDouble) {
          pair++;
        } else {
          distinct++;
        }
      }
    }
  }

  const totalSum = sumCounts.reduce((acc, c, s) => acc + c * s, 0);
  const mean = totalSum / THEORETICAL_OUTCOMES;
  const variance =
    sumCounts.reduce((acc, c, s) => acc + c * (s - mean) * (s - mean), 0) /
    THEORETICAL_OUTCOMES;
  const std = Math.sqrt(variance);

  return {
    outcomes: THEORETICAL_OUTCOMES,
    sumCounts,
    faceCounts,
    faceCountsByPos,
    big,
    small,
    triple,
    odd,
    even,
    pattern: {
      distinct,
      pair,
      triple,
      anyDouble: pair + triple,
    },
    tripleByFace,
    doubleByFace,
    sumMoments: {
      mean,
      variance,
      std,
    },
  };
}

export const THEORETICAL = buildTheoretical();

export function chiSquareUniform(counts) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  const expected = total / counts.length;
  let chi2 = 0;
  for (const obs of counts) {
    const diff = obs - expected;
    chi2 += (diff * diff) / expected;
  }
  return chi2;
}

export function computeSessionStats(rounds) {
  const faceCounts = Array.from({ length: DICE_FACES }, () => 0);
  const faceCountsByPos = Array.from({ length: DICE_PER_ROUND }, () =>
    Array.from({ length: DICE_FACES }, () => 0),
  );
  const sumCounts = Array.from({ length: 19 }, () => 0);

  const tripleByFace = Array.from({ length: DICE_FACES }, () => 0);
  const doubleByFace = Array.from({ length: DICE_FACES }, () => 0);
  const occByFace = Array.from({ length: DICE_FACES }, () =>
    Array.from({ length: 4 }, () => 0),
  );

  const multisetCounts = {};

  let big = 0;
  let small = 0;
  let triple = 0;
  let odd = 0;
  let even = 0;

  let distinct = 0;
  let pair = 0;

  const outcomes = [];
  let totalSum = 0;

  for (const r of rounds) {
    const dice = r.dice;
    const [a, b, c] = dice;

    faceCounts[a - 1]++;
    faceCounts[b - 1]++;
    faceCounts[c - 1]++;
    faceCountsByPos[0][a - 1]++;
    faceCountsByPos[1][b - 1]++;
    faceCountsByPos[2][c - 1]++;

    const sum = a + b + c;
    sumCounts[sum]++;
    totalSum += sum;

    const counts = countFaces(dice);
    for (let face = 1; face <= DICE_FACES; face++) {
      const c0 = counts[face - 1];
      occByFace[face - 1][c0]++;
      if (c0 >= 2) doubleByFace[face - 1]++;
      if (c0 === 3) tripleByFace[face - 1]++;
    }

    const key = toMultisetKey(dice);
    multisetCounts[key] = (multisetCounts[key] || 0) + 1;

    const outcome = classifyRound(dice);
    outcomes.push(outcome);

    if (outcome.type === "triple") {
      triple++;
    } else if (outcome.type === "big") {
      big++;
    } else {
      small++;
    }

    const oe = classifyOddEven(dice);
    if (oe.type === "odd") odd++;
    if (oe.type === "even") even++;

    const hasDouble = counts.some((x) => x >= 2);
    if (isTriple(dice)) {
      // triple
    } else if (hasDouble) {
      pair++;
    } else {
      distinct++;
    }
  }

  const totalRounds = rounds.length;
  const mean = totalRounds ? totalSum / totalRounds : 0;
  const variance =
    totalRounds === 0
      ? 0
      : rounds.reduce((acc, r) => {
          const s = sumDice(r.dice);
          return acc + (s - mean) * (s - mean);
        }, 0) / totalRounds;
  const std = Math.sqrt(variance);

  const streak = computeStreaks(outcomes);

  return {
    totalRounds,
    totalDice: totalRounds * DICE_PER_ROUND,
    faceCounts,
    faceCountsByPos,
    sumCounts,
    big,
    small,
    triple,
    odd,
    even,
    pattern: {
      distinct,
      pair,
      triple,
      anyDouble: pair + triple,
    },
    tripleByFace,
    doubleByFace,
    occByFace,
    multisetCounts,
    sumMoments: {
      mean,
      variance,
      std,
    },
    currentStreak: streak.current,
    longest: streak.longest,
  };
}

export function computeStreaks(outcomes) {
  let current = { type: "none", label: "", length: 0 };
  const longest = { big: 0, small: 0, triple: 0 };

  let prev = "";
  let run = 0;

  for (const o of outcomes) {
    if (o.type === prev) {
      run++;
    } else {
      prev = o.type;
      run = 1;
    }

    if (o.type === "big") longest.big = Math.max(longest.big, run);
    if (o.type === "small") longest.small = Math.max(longest.small, run);
    if (o.type === "triple") longest.triple = Math.max(longest.triple, run);
  }

  if (outcomes.length) {
    const last = outcomes[outcomes.length - 1];
    current = {
      type: last.type,
      label: last.type === "triple" ? "豹子" : last.label.split(" ")[0],
      length: run,
    };
  }

  return { current, longest };
}

export function csvEscape(value) {
  const needs = /[\n\r",]/.test(value);
  if (!needs) return value;
  return `"${value.replace(/\"/g, '""')}"`;
}

export function exportSessionCsv(session) {
  const rows = [["session", "at", "d1", "d2", "d3", "sum", "result"]];
  for (const r of session.rounds) {
    const [a, b, c] = r.dice;
    const sum = a + b + c;
    const outcome = classifyRound(r.dice);
    rows.push([
      session.name,
      r.at,
      String(a),
      String(b),
      String(c),
      String(sum),
      outcome.label,
    ]);
  }
  return rows.map((r) => r.map(csvEscape).join(",")).join("\n");
}

export function safeFilename(name) {
  const s = (name || "").trim() || "session";
  return s.replace(/[^a-zA-Z0-9\-_\u4e00-\u9fff]/g, "_").slice(0, 32);
}

export function formatTime(iso) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
}

export function formatFileTime(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

export function buildSummaryText(session, { limit = 20 } = {}) {
  const stats = computeSessionStats(session.rounds);

  const lines = [];
  lines.push(`【${session.name}】共 ${stats.totalRounds} 回合`);
  if (stats.totalRounds) {
    const bigPct = ((stats.big / stats.totalRounds) * 100).toFixed(2);
    const smallPct = ((stats.small / stats.totalRounds) * 100).toFixed(2);
    const triplePct = ((stats.triple / stats.totalRounds) * 100).toFixed(2);
    lines.push(
      `大 ${stats.big} (${bigPct}%) | 小 ${stats.small} (${smallPct}%) | 豹子 ${stats.triple} (${triplePct}%)`,
    );

    const oddEvenTotal = stats.odd + stats.even;
    if (oddEvenTotal) {
      const oddPct = ((stats.odd / oddEvenTotal) * 100).toFixed(2);
      const evenPct = ((stats.even / oddEvenTotal) * 100).toFixed(2);
      lines.push(
        `單 ${stats.odd} (${oddPct}%) | 雙 ${stats.even} (${evenPct}%)  (不含豹子)`,
      );
    }
  }

  const latest = session.rounds.slice(-limit);
  if (latest.length) {
    lines.push(`最近 ${latest.length}：`);
    for (const r of latest) {
      const outcome = classifyRound(r.dice);
      const [a, b, c] = r.dice;
      lines.push(`${formatTime(r.at)}  ${a}-${b}-${c}  ${outcome.label}`);
    }
  }

  return lines.join("\n");
}
