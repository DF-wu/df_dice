import { formatClock, formatGap, formatOutcomeLabel, formatParity, formatPercent } from "./format.js";
import { THEORY } from "./theory.js";

export const CSV_HEADER = [
  "局數",
  "骰1",
  "骰2",
  "骰3",
  "和值",
  "大小",
  "單雙",
  "對子",
  "豹子",
  "順子",
  "時間",
];

function yesNo(value) {
  return value ? "Y" : "N";
}

export function toJsonText(history) {
  return JSON.stringify(history, null, 2);
}

export function toCsvText(stats) {
  const rows = stats.roundRecords.map((record) => {
    const [first = "", second = "", third = ""] = record.rolls;

    if (!record.complete) {
      return [record.index, first, second, third, "", "進行中", "", "", "", "", ""].join(",");
    }

    const analysis = record.analysis;
    return [
      record.index,
      first,
      second,
      third,
      analysis.sum,
      formatOutcomeLabel(record.outcome),
      formatParity(analysis.parity),
      yesNo(analysis.double && !analysis.triple),
      yesNo(analysis.triple),
      yesNo(analysis.straight),
      formatClock(record.endedAt),
    ].join(",");
  });

  return [CSV_HEADER.join(","), ...rows].join("\n");
}

export function toSummaryText(stats) {
  if (stats.totalRolls === 0) {
    return "骰局統計：尚無紀錄。";
  }

  const lines = [
    "【骰局統計摘要】",
    `總骰數 ${stats.totalRolls} · 完成 ${stats.completedRounds} 局 · 進行中 ${stats.inProgressRolls}/3`,
    `平均和值 ${stats.averageSum.toFixed(2)} (理論 ${THEORY.meanSum.toFixed(2)}) · 標準差 ${stats.spread.stdDev.toFixed(2)}`,
    `大 ${stats.outcomeCounts.big} (${formatPercent(stats.outcomeRates.big, 1)}) · 小 ${stats.outcomeCounts.small} (${formatPercent(stats.outcomeRates.small, 1)}) · 豹子 ${stats.outcomeCounts.triple} (${formatPercent(stats.outcomeRates.triple, 1)})`,
    `單 ${stats.parityCounts.odd} · 雙 ${stats.parityCounts.even} · 對子 ${stats.patternCounts.double} · 順子 ${stats.patternCounts.straight}`,
    `骰面次數 ${stats.faceCounts.map((count, index) => `${index + 1}:${count}`).join(" ")}`,
    `熱門骰 ${stats.hotNumbers.join("、")} · 冷門骰 ${stats.coldNumbers.join("、")}`,
    `上次豹子 ${formatGap(stats.gaps.triple)} · 目前連續 ${formatOutcomeLabel(stats.streak.currentType)} ${stats.streak.currentLength}`,
    `最近走勢 ${stats.recentOutcomes.map((entry) => formatOutcomeLabel(entry)).join(">")}`,
  ];

  return lines.join("\n");
}

export function downloadText(doc, filename, text, mime = "text/plain") {
  const anchor = doc.createElement("a");
  anchor.href = `data:${mime};charset=utf-8,${encodeURIComponent(text)}`;
  anchor.download = filename;
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
