import { isRoundComplete, normalizeHistory } from "./history.js";
import { analyzeCompletedRound } from "./stats.js";

function formatPercent(rate) {
  return `${(rate * 100).toFixed(2)}%`;
}

function formatOutcomeLabel(outcome) {
  switch (outcome) {
    case "big":
      return "大";
    case "small":
      return "小";
    case "triple":
      return "豹子";
    default:
      return "-";
  }
}

export function renderHistory(container, history) {
  const rounds = normalizeHistory(history);

  if (rounds.length === 0) {
    container.innerHTML = "<h2>歷史紀錄</h2><p class=\"empty\">尚無紀錄</p>";
    return;
  }

  const rows = [...rounds].reverse().map((round) => {
    const values = round.rolls.map((value) => `<b>${value}</b>`).join(" ");

    if (!isRoundComplete(round)) {
      return `<li>${values} 進行中 (${round.rolls.length}/3)</li>`;
    }

    const analyzed = analyzeCompletedRound(round);
    const cssClass = analyzed.triple
      ? "sp"
      : analyzed.sizeType === "big"
        ? "large"
        : "small";
    const tags = [
      formatOutcomeLabel(analyzed.triple ? "triple" : analyzed.sizeType),
      String(analyzed.sum),
      analyzed.parity === "odd" ? "單" : "雙",
    ];

    if (analyzed.double && !analyzed.triple) {
      tags.push("對子");
    }

    if (analyzed.straight) {
      tags.push("順子");
    }

    return `<li class="${cssClass}"><span class="mono">${values}</span> ${tags.join(" / ")}</li>`;
  });

  container.innerHTML = `
    <h2>歷史紀錄</h2>
    <ul class="historyList">${rows.join("")}</ul>
  `;
}

export function renderStatistics(container, stats) {
  if (stats.totalRolls === 0) {
    container.innerHTML = "<h2>統計面板</h2><p class=\"empty\">尚無統計資料</p>";
    return;
  }

  const faceRows = stats.faceCounts
    .map(
      (count, index) =>
        `<li><img src="dice/dice${index + 1}.png" width="16" height="16" alt="dice${index + 1}" /> <span class="mono">${count}</span> (${formatPercent(
          stats.faceRates[index],
        )})</li>`,
    )
    .join("");

  const sumRows = Object.keys(stats.sumCounts)
    .map(
      (sum) =>
        `<li><span class="mono">${sum}點</span>: <span class="mono">${stats.sumCounts[sum]}</span> (${formatPercent(
          stats.sumRates[sum],
        )})</li>`,
    )
    .join("");

  const hotText = stats.hotNumbers.length ? stats.hotNumbers.join(", ") : "-";
  const coldText = stats.coldNumbers.length ? stats.coldNumbers.join(", ") : "-";
  const trendText = stats.recentOutcomes.length
    ? stats.recentOutcomes.map((entry) => formatOutcomeLabel(entry)).join(" > ")
    : "-";
  const streakType = stats.streak.currentType ? formatOutcomeLabel(stats.streak.currentType) : "-";

  container.innerHTML = `
    <h2>統計面板</h2>
    <section>
      <div class="meta-grid">
        <div><b>總骰數:</b> <span class="mono">${stats.totalRolls}</span></div>
        <div><b>總局數:</b> <span class="mono">${stats.totalRounds}</span></div>
        <div><b>已完成局數:</b> <span class="mono">${stats.completedRounds}</span></div>
        <div><b>目前局進度:</b> <span class="mono">${stats.inProgressRolls}/3</span></div>
        <div><b>平均和值:</b> <span class="mono">${stats.averageSum.toFixed(2)}</span></div>
      </div>
    </section>

    <section>
      <b>骰面分佈</b>
      <ul class="mono">${faceRows}</ul>
      <div><b>熱門骰:</b> ${hotText}</div>
      <div><b>冷門骰:</b> ${coldText}</div>
    </section>

    <section>
      <b>大小/豹子</b>
      <ul class="mono">
        <li>大: ${stats.outcomeCounts.big} (${formatPercent(stats.outcomeRates.big)})</li>
        <li>小: ${stats.outcomeCounts.small} (${formatPercent(stats.outcomeRates.small)})</li>
        <li>豹子: ${stats.outcomeCounts.triple} (${formatPercent(stats.outcomeRates.triple)})</li>
      </ul>
    </section>

    <section>
      <b>單雙分佈</b>
      <ul class="mono">
        <li>單: ${stats.parityCounts.odd} (${formatPercent(stats.parityRates.odd)})</li>
        <li>雙: ${stats.parityCounts.even} (${formatPercent(stats.parityRates.even)})</li>
      </ul>
    </section>

    <section>
      <b>型態統計</b>
      <ul class="mono">
        <li>對子: ${stats.patternCounts.double} (${formatPercent(stats.patternRates.double)})</li>
        <li>豹子: ${stats.patternCounts.triple} (${formatPercent(stats.patternRates.triple)})</li>
        <li>順子: ${stats.patternCounts.straight} (${formatPercent(stats.patternRates.straight)})</li>
      </ul>
    </section>

    <section>
      <b>和值分佈</b>
      <ul class="sum-grid mono">${sumRows}</ul>
    </section>

    <section>
      <div><b>目前大小連續:</b> ${streakType} <span class="mono">${stats.streak.currentLength}</span></div>
      <div><b>最長大連:</b> <span class="mono">${stats.streak.longestBig}</span></div>
      <div><b>最長小連:</b> <span class="mono">${stats.streak.longestSmall}</span></div>
      <div><b>最近10局:</b> ${trendText}</div>
    </section>
  `;
}
