import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  THEORETICAL,
  buildSummaryText,
  chiSquareUniform,
  classifyOddEven,
  classifyRound,
  computeSessionStats,
  exportSessionCsv,
  safeFilename,
  sumDice,
  toMultisetKey,
} from "../core.js";

describe("core", () => {
  it("theoretical stats are consistent", () => {
    assert.equal(THEORETICAL.outcomes, 216);
    assert.equal(
      THEORETICAL.sumCounts.reduce((a, b) => a + b, 0),
      216,
    );
    assert.deepEqual(THEORETICAL.faceCounts, [108, 108, 108, 108, 108, 108]);

    assert.equal(THEORETICAL.triple, 6);
    assert.equal(THEORETICAL.big, 105);
    assert.equal(THEORETICAL.small, 105);
    assert.equal(THEORETICAL.big + THEORETICAL.small + THEORETICAL.triple, 216);

    assert.equal(THEORETICAL.odd + THEORETICAL.even, 210);
    assert.equal(THEORETICAL.odd, 105);
    assert.equal(THEORETICAL.even, 105);

    assert.deepEqual(THEORETICAL.pattern, {
      distinct: 120,
      pair: 90,
      triple: 6,
      anyDouble: 96,
    });

    assert.equal(THEORETICAL.sumMoments.mean, 10.5);
    assert.ok(Math.abs(THEORETICAL.sumMoments.std - 2.958) < 0.01);
  });

  it("classifyRound and classifyOddEven", () => {
    const t = classifyRound([4, 4, 4]);
    assert.equal(t.type, "triple");
    assert.equal(t.sum, 12);
    assert.equal(t.face, 4);
    assert.ok(t.label.includes("豹子 4"));

    const big = classifyRound([6, 6, 5]);
    assert.equal(big.type, "big");
    assert.equal(big.sum, 17);

    const small = classifyRound([1, 2, 3]);
    assert.equal(small.type, "small");
    assert.equal(small.sum, 6);

    assert.deepEqual(classifyOddEven([4, 4, 4]), { type: "none", label: "(豹子不計)" });
    assert.equal(classifyOddEven([1, 1, 2]).type, "even");
    assert.equal(classifyOddEven([6, 5, 6]).type, "odd");
  });

  it("computeSessionStats aggregates correctly", () => {
    const rounds = [
      { id: "r1", at: "2026-01-01T00:00:00.000Z", dice: [1, 1, 2] },
      { id: "r2", at: "2026-01-01T00:01:00.000Z", dice: [4, 4, 4] },
      { id: "r3", at: "2026-01-01T00:02:00.000Z", dice: [6, 5, 6] },
    ];
    const stats = computeSessionStats(rounds);

    assert.equal(stats.totalRounds, 3);
    assert.equal(stats.totalDice, 9);
    assert.equal(stats.big, 1);
    assert.equal(stats.small, 1);
    assert.equal(stats.triple, 1);
    assert.equal(stats.odd, 1);
    assert.equal(stats.even, 1);

    assert.deepEqual(stats.tripleByFace, [0, 0, 0, 1, 0, 0]);
    assert.deepEqual(stats.doubleByFace, [1, 0, 0, 1, 0, 1]);
    assert.deepEqual(stats.sumCounts[sumDice([1, 1, 2])], 1);
    assert.deepEqual(stats.sumCounts[sumDice([4, 4, 4])], 1);
    assert.deepEqual(stats.sumCounts[sumDice([6, 5, 6])], 1);

    assert.deepEqual(stats.multisetCounts, {
      "1-1-2": 1,
      "4-4-4": 1,
      "5-6-6": 1,
    });
    assert.equal(toMultisetKey([6, 5, 6]), "5-6-6");
    assert.equal(stats.sumMoments.mean, (4 + 12 + 17) / 3);
  });

  it("chiSquareUniform returns expected values", () => {
    assert.equal(chiSquareUniform([10, 10, 10, 10, 10, 10]), 0);
    assert.ok(chiSquareUniform([12, 8, 10, 10, 10, 10]) > 0);
  });

  it("CSV export and safeFilename", () => {
    const session = {
      name: "測試局",
      rounds: [{ id: "r1", at: "2026-01-01T00:00:00.000Z", dice: [1, 1, 2] }],
    };
    const csv = exportSessionCsv(session);
    assert.ok(csv.startsWith("session,at,d1,d2,d3,sum,result"));
    assert.ok(csv.includes("測試局"));
    assert.ok(csv.includes("1,1,2"));
    assert.ok(csv.includes("小 4"));

    assert.equal(safeFilename("a/b:c*"), "a_b_c_");
  });

  it("buildSummaryText contains key stats", () => {
    const session = {
      name: "摘要",
      rounds: [
        { id: "r1", at: "2026-01-01T00:00:00.000Z", dice: [1, 1, 2] },
        { id: "r2", at: "2026-01-01T00:01:00.000Z", dice: [4, 4, 4] },
      ],
    };
    const text = buildSummaryText(session, { limit: 10 });
    assert.ok(text.includes("【摘要】"));
    assert.ok(text.includes("共 2 回合"));
    assert.ok(text.includes("豹子"));
    assert.ok(text.includes("最近 2"));
  });
});
