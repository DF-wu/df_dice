import { getRoundResult } from "./diceStats.js";

function percent(rate) {
  return `${(rate * 100).toFixed(2)}%`;
}

function diceIcon(face, size = 16) {
  return `<img src="dice/dice${face}.png" width="${size}" height="${size}" alt="dice${face}">`;
}

export function renderHistory(history) {
  if (!history.length) {
    return "<p>尚無紀錄</p>";
  }

  const rows = history
    .slice()
    .reverse()
    .map((round) => {
      const values = [round.first, round.second, round.third]
        .filter(Boolean)
        .map((value) => `<b>${value}</b>`)
        .join(" ");

      const result = getRoundResult(round);
      if (!result) {
        return `<li class="pending">${values} 進行中 (${round.stage}/3)</li>`;
      }

      const kind = result.leopard ? "豹子" : result.big ? "大" : "小";
      const cssClass = result.leopard ? "sp" : result.big ? "large" : "small";

      return `<li class="${cssClass}">${values} ${kind} ${result.sum}</li>`;
    })
    .join("");

  return `<ul>${rows}</ul>`;
}

export function renderStatistics(stats) {
  const faceRows = stats.faces.counts
    .map(
      (count, index) =>
        `<div>${diceIcon(index + 1)} 出現 ${count} 次 (${percent(stats.faces.rates[index])})，命中回合 ${stats.faces.roundHitCounts[index]} (${percent(stats.faces.roundHitRates[index])})</div>`,
    )
    .join("");

  const sumRows = Array.from({ length: 16 }, (_, idx) => idx + 3)
    .map((sum) => `<div>${sum} 點: ${stats.sums.counts[sum]} 回 (${percent(stats.sums.rates[sum])})</div>`)
    .join("");

  const pairRows = stats.pairFaces.counts
    .map((count, index) => `<div>${index + 1} 對: ${count} 回 (${percent(stats.pairFaces.rates[index])})</div>`)
    .join("");

  const tripleRows = stats.triples.counts
    .map((count, index) => `<div>${index + 1}${index + 1}${index + 1}: ${count} 回 (${percent(stats.triples.rates[index])})</div>`)
    .join("");

  return `
  <section>
    <h3>總覽</h3>
    <div>總擲骰數: ${stats.meta.totalRolls}</div>
    <div>完整回合: ${stats.meta.completedRounds}</div>
    <div>未完成回合: ${stats.meta.inProgressRounds}</div>
  </section>

  <section>
    <h3>大小 / 豹子 / 單雙</h3>
    <div><span style="color:red">大</span> ${stats.outcomes.big} 回 (${percent(stats.outcomes.bigRate)})</div>
    <div><span style="color:green">小</span> ${stats.outcomes.small} 回 (${percent(stats.outcomes.smallRate)})</div>
    <div><span style="color:blue">豹子</span> ${stats.outcomes.leopard} 回 (${percent(stats.outcomes.leopardRate)})</div>
    <div>單 ${stats.outcomes.odd} 回 (${percent(stats.outcomes.oddRate)})</div>
    <div>雙 ${stats.outcomes.even} 回 (${percent(stats.outcomes.evenRate)})</div>
    <div>順子 ${stats.outcomes.straight} 回 (${percent(stats.outcomes.straightRate)})</div>
    <div>有對子 ${stats.outcomes.pair} 回 (${percent(stats.outcomes.pairRate)})</div>
  </section>

  <section>
    <h3>單顆點數</h3>
    ${faceRows}
  </section>

  <section>
    <h3>總點數分布</h3>
    ${sumRows}
  </section>

  <section>
    <h3>對子統計</h3>
    ${pairRows}
  </section>

  <section>
    <h3>豹子統計</h3>
    ${tripleRows}
  </section>`;
}
