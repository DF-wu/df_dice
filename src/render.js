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

function renderBar(rate) {
  const pct = Math.min(100, Math.round(rate * 100));
  return `<span class="pct-bar"><span class="pct-fill" style="width:${pct}%"></span></span>`;
}

export function renderHistory(container, history) {
  const rounds = normalizeHistory(history);

  if (rounds.length === 0) {
    container.innerHTML = "<p>尚無紀錄</p>";
    return;
  }

  const rows = [...rounds].reverse().map((round) => {
    const values = round.rolls
      .map(
        (v) =>
          `<img src="dice/dice${v}.png" width="28" height="28" alt="${v}" class="roll-dice">`,
      )
      .join("");

    if (!isRoundComplete(round)) {
      const empties = Array.from(
        { length: 3 - round.rolls.length },
        () => `<span class="dice-empty"></span>`,
      ).join("");
      return `<li class="in-progress"><span class="roll-values">${values}${empties}</span><span class="progress-tag"> 進行中 (${round.rolls.length}/3)</span></li>`;
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

    return `<li class="${cssClass}"><span class="roll-values">${values}</span><span class="roll-tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</span></li>`;
  });

  container.innerHTML = `<ul>${rows.join("")}</ul>`;
}

export function renderStatistics(container, stats) {
  if (stats.totalRolls === 0) {
    container.innerHTML = "<p>尚無統計資料</p>";
    return;
  }

  const faceRows = stats.faceCounts
    .map(
      (count, index) =>
        `<li class="face-row"><img src="dice/dice${index + 1}.png" width="22" height="22" alt="dice${index + 1}"><span class="face-count">${count}</span><span class="face-pct">${formatPercent(stats.faceRates[index])}</span>${renderBar(stats.faceRates[index])}</li>`,
    )
    .join("");

  const sumRows = Object.keys(stats.sumCounts)
    .map(
      (sum) =>
        `<li class="sum-row"><span class="sum-label">${sum}</span><span class="sum-count">${stats.sumCounts[sum]}</span><span class="sum-pct">${formatPercent(stats.sumRates[sum])}</span></li>`,
    )
    .join("");

  const hotText = stats.hotNumbers.length ? stats.hotNumbers.join(", ") : "-";
  const coldText = stats.coldNumbers.length ? stats.coldNumbers.join(", ") : "-";
  const trendText = stats.recentOutcomes.length
    ? stats.recentOutcomes.map((entry) => formatOutcomeLabel(entry)).join(" › ")
    : "-";
  const streakType = stats.streak.currentType ? formatOutcomeLabel(stats.streak.currentType) : "-";

  container.innerHTML = `
    <section>
      <h3 class="stat-heading">總覽</h3>
      <div class="stat-grid">
        <div class="stat-cell"><span class="sc-label">總骰數</span><span class="sc-val">${stats.totalRolls}</span></div>
        <div class="stat-cell"><span class="sc-label">完成局</span><span class="sc-val">${stats.completedRounds}</span></div>
        <div class="stat-cell"><span class="sc-label">本局進度</span><span class="sc-val">${stats.inProgressRolls}/3</span></div>
        <div class="stat-cell"><span class="sc-label">平均和</span><span class="sc-val">${stats.averageSum.toFixed(2)}</span></div>
      </div>
    </section>

    <section>
      <h3 class="stat-heading">骰面分佈</h3>
      <ul class="face-list">${faceRows}</ul>
      <div class="hot-cold"><div><b>熱門骰:</b> ${hotText}</div><div><b>冷門骰:</b> ${coldText}</div></div>
    </section>

    <section>
      <h3 class="stat-heading">大小/豹子</h3>
      <ul class="outcome-list">
        <li class="large">大: ${stats.outcomeCounts.big}<span class="pct"> (${formatPercent(stats.outcomeRates.big)})</span>${renderBar(stats.outcomeRates.big)}</li>
        <li class="small">小: ${stats.outcomeCounts.small}<span class="pct"> (${formatPercent(stats.outcomeRates.small)})</span>${renderBar(stats.outcomeRates.small)}</li>
        <li class="sp">豹子: ${stats.outcomeCounts.triple}<span class="pct"> (${formatPercent(stats.outcomeRates.triple)})</span>${renderBar(stats.outcomeRates.triple)}</li>
      </ul>
    </section>

    <section>
      <h3 class="stat-heading">單雙分佈</h3>
      <ul class="outcome-list">
        <li>單: ${stats.parityCounts.odd}<span class="pct"> (${formatPercent(stats.parityRates.odd)})</span>${renderBar(stats.parityRates.odd)}</li>
        <li>雙: ${stats.parityCounts.even}<span class="pct"> (${formatPercent(stats.parityRates.even)})</span>${renderBar(stats.parityRates.even)}</li>
      </ul>
    </section>

    <section>
      <h3 class="stat-heading">型態統計</h3>
      <ul class="outcome-list">
        <li>對子: ${stats.patternCounts.double}<span class="pct"> (${formatPercent(stats.patternRates.double)})</span>${renderBar(stats.patternRates.double)}</li>
        <li class="sp">豹子: ${stats.patternCounts.triple}<span class="pct"> (${formatPercent(stats.patternRates.triple)})</span>${renderBar(stats.patternRates.triple)}</li>
        <li>順子: ${stats.patternCounts.straight}<span class="pct"> (${formatPercent(stats.patternRates.straight)})</span>${renderBar(stats.patternRates.straight)}</li>
      </ul>
    </section>

    <section>
      <h3 class="stat-heading">和值分佈</h3>
      <ul class="sum-list">${sumRows}</ul>
    </section>

    <section>
      <h3 class="stat-heading">連續與趨勢</h3>
      <div class="streak-info">
        <div><b>目前大小連續:</b> ${streakType} ${stats.streak.currentLength}</div>
        <div><b>最長大連:</b> ${stats.streak.longestBig}</div>
        <div><b>最長小連:</b> ${stats.streak.longestSmall}</div>
        <div><b>最近10局:</b> ${trendText}</div>
      </div>
    </section>
  `;
}
