import { beadRoad, columnChart, heatGrid, meterRow, sparkline } from "./charts.js";
import {
  formatClock,
  formatDuration,
  formatGap,
  formatOutcomeClass,
  formatOutcomeLabel,
  formatParity,
  formatPercent,
  formatSigned,
  formatSignedPercent,
  formatVerdict,
} from "./format.js";
import { FACE_COUNT, SUM_BUCKETS, SUM_MAX, SUM_MIN, THEORY } from "./theory.js";
import { THEMES } from "./themes.js";
import { calculateStatistics } from "./stats.js";

export const TABS = [
  { key: "overview", label: "總覽" },
  { key: "faces", label: "骰面" },
  { key: "sums", label: "和值" },
  { key: "patterns", label: "型態" },
  { key: "trend", label: "趨勢" },
];

export const HISTORY_FILTERS = [
  { key: "all", label: "全部" },
  { key: "big", label: "大" },
  { key: "small", label: "小" },
  { key: "triple", label: "豹子" },
  { key: "double", label: "對子" },
  { key: "straight", label: "順子" },
  { key: "odd", label: "單" },
  { key: "even", label: "雙" },
];

const FACE_LABELS = Array.from({ length: FACE_COUNT }, (_value, index) => `${index + 1}`);
const POSITION_LABELS = ["第一顆", "第二顆", "第三顆"];

function statCard(label, value, note) {
  return `<div class="stat-cell"><span class="sc-label">${label}</span><span class="sc-val">${value}</span><span class="sc-note">${note}</span></div>`;
}

function section(title, body, note = "") {
  const hint = note === "" ? "" : `<p class="stat-note">${note}</p>`;
  return `<section><h3 class="stat-heading">${title}</h3>${body}${hint}</section>`;
}

function deltaMeta(count, rate, expectedRate) {
  return `${count} · ${formatPercent(rate)} <i class="delta">${formatSignedPercent(rate - expectedRate)}</i>`;
}

export function matchesFilter(record, filter) {
  if (filter === "all") {
    return true;
  }
  if (!record.complete) {
    return false;
  }
  if (filter === "odd" || filter === "even") {
    return record.analysis.parity === filter;
  }
  if (filter === "double") {
    return record.analysis.double && !record.analysis.triple;
  }
  if (filter === "straight") {
    return record.analysis.straight;
  }
  return record.outcome === filter;
}

function buildTabs(activeTab) {
  const buttons = TABS.map(
    (tab) =>
      `<button type="button" class="tab${tab.key === activeTab ? " is-active" : ""}" data-tab="${tab.key}" role="tab" aria-selected="${tab.key === activeTab}">${tab.label}</button>`,
  ).join("");
  return `<nav class="tabs" role="tablist">${buttons}</nav>`;
}

function buildOverview(stats) {
  const timing = stats.timing;
  const kpis = [
    statCard("總骰數", stats.totalRolls, `${stats.totalRounds} 局`),
    statCard("已完成局", stats.completedRounds, `進行中 ${stats.inProgressRolls}/3`),
    statCard("平均和值", stats.averageSum.toFixed(2), `理論 ${THEORY.meanSum.toFixed(2)}`),
    statCard("和值中位數", stats.spread.median.toFixed(1), `全距 ${stats.spread.range}`),
    statCard("標準差", stats.spread.stdDev.toFixed(2), `理論 ${THEORY.stdDevSum.toFixed(2)}`),
    statCard("大小連續", `${formatOutcomeLabel(stats.streak.currentType)} ${stats.streak.currentLength}`, `最長 大${stats.streak.longestBig} / 小${stats.streak.longestSmall}`),
    statCard("牌路型態", stats.switchRate >= 0.5 ? "偏跳" : "偏連", `轉折率 ${formatPercent(stats.switchRate)}`),
    timing === null
      ? statCard("計時", "尚未計時", "新紀錄自動計時")
      : statCard("遊戲時長", formatDuration(timing.elapsedMs), `每局約 ${formatDuration(timing.averageRoundMs)}`),
  ].join("");

  const outcomeRows = [
    meterRow("大", stats.outcomeCounts.big, stats.outcomeRates.big, {
      tone: "tone-big",
      markerRate: THEORY.outcomeRates.big,
      meta: deltaMeta(stats.outcomeCounts.big, stats.outcomeRates.big, THEORY.outcomeRates.big),
    }),
    meterRow("小", stats.outcomeCounts.small, stats.outcomeRates.small, {
      tone: "tone-small",
      markerRate: THEORY.outcomeRates.small,
      meta: deltaMeta(stats.outcomeCounts.small, stats.outcomeRates.small, THEORY.outcomeRates.small),
    }),
    meterRow("豹子", stats.outcomeCounts.triple, stats.outcomeRates.triple, {
      tone: "tone-sp",
      markerRate: THEORY.outcomeRates.triple,
      meta: deltaMeta(stats.outcomeCounts.triple, stats.outcomeRates.triple, THEORY.outcomeRates.triple),
    }),
  ].join("");

  const parityRows = [
    meterRow("單", stats.parityCounts.odd, stats.parityRates.odd, {
      markerRate: THEORY.parityRates.odd,
      meta: deltaMeta(stats.parityCounts.odd, stats.parityRates.odd, THEORY.parityRates.odd),
    }),
    meterRow("雙", stats.parityCounts.even, stats.parityRates.even, {
      markerRate: THEORY.parityRates.even,
      meta: deltaMeta(stats.parityCounts.even, stats.parityRates.even, THEORY.parityRates.even),
    }),
  ].join("");

  const trendText = stats.recentOutcomes.length
    ? stats.recentOutcomes.map((entry) => formatOutcomeLabel(entry)).join(" › ")
    : "-";

  return [
    section("核心數據", `<div class="stat-grid">${kpis}</div>`),
    `<div class="split-grid">
      ${section("大小/豹子", `<ul class="meter-list">${outcomeRows}</ul>`, "細線為理論機率位置")}
      ${section("單雙分佈", `<ul class="meter-list">${parityRows}</ul>`)}
    </div>`,
    section("大小路單", beadRoad(stats.outcomes), `最近10局: ${trendText}`),
    section(
      "和值走勢",
      sparkline(stats.sumSeries, { baseline: THEORY.meanSum }),
      `虛線為理論平均 ${THEORY.meanSum.toFixed(2)} 點`,
    ),
  ].join("");
}

function buildFaces(stats) {
  const faceRows = stats.faceDeviation
    .map((entry) =>
      meterRow(`骰 ${entry.face}`, entry.count, entry.rate, {
        markerRate: THEORY.faceRate,
        meta: `${entry.count} · ${formatPercent(entry.rate)} <i class="delta">${formatSigned(entry.deltaCount, 1)}</i>`,
      }),
    )
    .join("");

  const hotText = stats.hotNumbers.length ? stats.hotNumbers.join("、") : "-";
  const coldText = stats.coldNumbers.length ? stats.coldNumbers.join("、") : "-";

  const chi = stats.chiSquare;
  const fairness = `<div class="stat-grid">
    ${statCard("卡方值 χ²", chi.value.toFixed(2), `自由度 ${chi.degreesOfFreedom}`)}
    ${statCard("每面期望", chi.expected.toFixed(1), "次")}
    ${statCard("均勻性判定", formatVerdict(chi.verdict), "χ²<11.07 視為均勻")}
    ${statCard("熱門 / 冷門", `${hotText} / ${coldText}`, "出現最多 / 最少")}
  </div>`;

  const gapRows = stats.gaps.byFace
    .map((gap, index) => `<li class="sum-pill"><b>骰 ${index + 1}</b><span>${formatGap(gap)}</span></li>`)
    .join("");

  return [
    section("骰面分佈", `<ul class="meter-list">${faceRows}</ul>`, `熱門骰: ${hotText} | 冷門骰: ${coldText}`),
    section("公平性檢定", fairness),
    section(
      "位置分佈",
      heatGrid(stats.positionCounts, {
        rowLabels: POSITION_LABELS,
        columnLabels: FACE_LABELS,
      }),
      "每局第 N 顆骰子開出的點數次數",
    ),
    section(
      "同局共現矩陣",
      heatGrid(stats.pairMatrix, {
        rowLabels: FACE_LABELS,
        columnLabels: FACE_LABELS,
      }),
      "同一局中兩顆骰子同時出現的次數",
    ),
    section("骰面遺漏", `<ul class="sum-grid">${gapRows}</ul>`, "距離上次出現的局數"),
  ].join("");
}

function buildSums(stats) {
  const items = [];
  for (let sum = SUM_MIN; sum <= SUM_MAX; sum += 1) {
    items.push({
      label: `${sum}`,
      value: stats.sumCounts[sum],
      expected: THEORY.sumRates[sum] * stats.completedRounds,
      title: `${sum} 點：${stats.sumCounts[sum]} 次 (${formatPercent(stats.sumRates[sum])})，理論 ${formatPercent(THEORY.sumRates[sum])}`,
    });
  }

  const bucketRows = SUM_BUCKETS.map((bucket) =>
    meterRow(bucket.label, stats.bucketCounts[bucket.key], stats.bucketRates[bucket.key], {
      markerRate: THEORY.bucketRates[bucket.key],
      meta: deltaMeta(
        stats.bucketCounts[bucket.key],
        stats.bucketRates[bucket.key],
        THEORY.bucketRates[bucket.key],
      ),
    }),
  ).join("");

  const rankRow = (entry) =>
    `<li class="sum-pill"><b>${entry.sum} 點</b><span>${entry.count} 次 / ${formatPercent(entry.rate)}</span></li>`;

  const extremes = stats.extremes;
  const extremeCards =
    extremes === null
      ? statCard("極值", "-", "尚無完成局")
      : `${statCard("最高和值", extremes.highest.sum, `第 ${extremes.highest.index} 局`)}
         ${statCard("最低和值", extremes.lowest.sum, `第 ${extremes.lowest.index} 局`)}`;

  const gapRows = [];
  for (let sum = SUM_MIN; sum <= SUM_MAX; sum += 1) {
    gapRows.push(
      `<li class="sum-pill"><b>${sum} 點</b><span>${formatGap(stats.gaps.bySum[sum])}</span></li>`,
    );
  }

  return [
    section(
      "和值分佈",
      columnChart(items, { highlight: extremes === null ? null : `${extremes.highest.sum}` }),
      "淺色為理論期望次數",
    ),
    section("和值區間", `<ul class="meter-list">${bucketRows}</ul>`),
    `<div class="split-grid">
      ${section("最常開出", `<ul class="sum-grid two">${stats.topSums.map(rankRow).join("")}</ul>`)}
      ${section("最少開出", `<ul class="sum-grid two">${stats.rareSums.map(rankRow).join("")}</ul>`)}
    </div>`,
    section("和值極值", `<div class="stat-grid">${extremeCards}</div>`),
    section("和值遺漏", `<ul class="sum-grid">${gapRows.join("")}</ul>`, "距離上次開出的局數"),
  ].join("");
}

function buildPatterns(stats) {
  const patternRows = [
    meterRow("對子", stats.patternCounts.double, stats.patternRates.double, {
      markerRate: THEORY.patternRates.double,
      meta: deltaMeta(stats.patternCounts.double, stats.patternRates.double, THEORY.patternRates.double),
    }),
    meterRow("豹子", stats.patternCounts.triple, stats.patternRates.triple, {
      tone: "tone-sp",
      markerRate: THEORY.patternRates.triple,
      meta: deltaMeta(stats.patternCounts.triple, stats.patternRates.triple, THEORY.patternRates.triple),
    }),
    meterRow("順子", stats.patternCounts.straight, stats.patternRates.straight, {
      markerRate: THEORY.patternRates.straight,
      meta: deltaMeta(
        stats.patternCounts.straight,
        stats.patternRates.straight,
        THEORY.patternRates.straight,
      ),
    }),
  ].join("");

  const tripleCards = stats.tripleCounts
    .map((count, index) => `<li class="sum-pill"><b>豹 ${index + 1}</b><span>${count} 次</span></li>`)
    .join("");

  const gapCards = `<div class="stat-grid">
    ${statCard("上次豹子", formatGap(stats.gaps.triple), `共 ${stats.patternCounts.triple} 次`)}
    ${statCard("上次對子", formatGap(stats.gaps.double), `共 ${stats.patternCounts.double} 次`)}
    ${statCard("上次順子", formatGap(stats.gaps.straight), `共 ${stats.patternCounts.straight} 次`)}
    ${statCard("豹子理論值", formatPercent(THEORY.patternRates.triple), "每 36 局約 1 次")}
  </div>`;

  return [
    section("型態統計", `<ul class="meter-list">${patternRows}</ul>`, "細線為理論機率位置"),
    section("圍骰分佈", `<ul class="sum-grid">${tripleCards}</ul>`, "各點數開出豹子的次數"),
    section("特殊型態遺漏", gapCards),
  ].join("");
}

function buildTrend(stats) {
  const longest = stats.outcomeStreak.longest;
  const parityLongest = stats.parityStreak.longest;

  const streakCards = `<div class="stat-grid">
    ${statCard("目前連續", `${formatOutcomeLabel(stats.outcomeStreak.currentValue)} ${stats.outcomeStreak.currentLength}`, "含豹子計入")}
    ${statCard("最長大連", longest.big ?? 0, "連續開大")}
    ${statCard("最長小連", longest.small ?? 0, "連續開小")}
    ${statCard("最長單/雙連", `${parityLongest.odd ?? 0} / ${parityLongest.even ?? 0}`, "連續單 / 連續雙")}
  </div>`;

  const rhythmCards = `<div class="stat-grid">
    ${statCard("大小轉折", stats.switches, "大小交替次數")}
    ${statCard("轉折率", formatPercent(stats.switchRate), stats.switchRate >= 0.5 ? "偏跳" : "偏連")}
    ${statCard("上次開大", formatGap(stats.gaps.big), `共 ${stats.outcomeCounts.big} 次`)}
    ${statCard("上次開小", formatGap(stats.gaps.small), `共 ${stats.outcomeCounts.small} 次`)}
  </div>`;

  const recentRows = stats.roundRecords
    .filter((record) => record.complete)
    .slice(-12)
    .reverse()
    .map(
      (record) =>
        `<tr><td>${record.index}</td><td>${record.rolls.join(" · ")}</td><td>${record.analysis.sum}</td><td><span class="tag ${formatOutcomeClass(record.outcome)}">${formatOutcomeLabel(record.outcome)}</span></td><td>${formatParity(record.analysis.parity)}</td><td>${formatClock(record.endedAt)}</td></tr>`,
    )
    .join("");

  const recentTable =
    recentRows === ""
      ? `<p class="empty small-note">尚無完成局</p>`
      : `<table class="data-table"><thead><tr><th>局</th><th>點數</th><th>和值</th><th>大小</th><th>單雙</th><th>時間</th></tr></thead><tbody>${recentRows}</tbody></table>`;

  return [
    section("連續紀錄", streakCards),
    section("節奏分析", rhythmCards),
    section(
      "移動平均 (5局)",
      sparkline(stats.movingAverages, { baseline: THEORY.meanSum }),
      "平滑後的和值走勢，可看出偏大或偏小的區段",
    ),
    section("最近 12 局明細", recentTable),
  ].join("");
}

const TAB_BUILDERS = {
  overview: buildOverview,
  faces: buildFaces,
  sums: buildSums,
  patterns: buildPatterns,
  trend: buildTrend,
};

export function renderStatistics(container, stats, options = {}) {
  const activeTab = TAB_BUILDERS[options.activeTab] ? options.activeTab : "overview";

  if (stats.totalRolls === 0) {
    container.innerHTML = `
      <div class="panel-head">
        <h2 class="panel-title">統計面板</h2>
      </div>
      <p>尚無統計資料，點擊左側骰子開始記錄。</p>
    `;
    return;
  }

  container.innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">統計面板</h2>
      ${buildTabs(activeTab)}
    </div>
    <div class="stats-grid">${TAB_BUILDERS[activeTab](stats)}</div>
  `;
}

function buildFilterBar(records, activeFilter) {
  const chips = HISTORY_FILTERS.map((filter) => {
    const count = records.filter((record) => matchesFilter(record, filter.key)).length;
    const active = filter.key === activeFilter ? " is-active" : "";
    return `<button type="button" class="chip${active}" data-filter="${filter.key}">${filter.label}<i>${count}</i></button>`;
  }).join("");

  return `<div class="filter-bar">${chips}</div>`;
}

function buildRecordRow(record, previousSum) {
  const values = record.rolls
    .map(
      (value) =>
        `<img class="roll-dice" src="dice/dice${value}.png" width="28" height="28" alt="${value}">`,
    )
    .join("");

  if (!record.complete) {
    const empties = Array.from(
      { length: 3 - record.rolls.length },
      () => `<span class="dice-empty"></span>`,
    ).join("");

    return `
      <li class="in-progress">
        <span class="round-num">#${record.index}</span>
        <span class="roll-values">${values}${empties}</span>
        <span class="progress-tag">進行中 (${record.rolls.length}/3)</span>
      </li>
    `;
  }

  const analysis = record.analysis;
  const tags = [
    `<span class="tag ${formatOutcomeClass(record.outcome)}">${formatOutcomeLabel(record.outcome)}</span>`,
    `<span class="tag">${formatParity(analysis.parity)}</span>`,
  ];

  if (analysis.double && !analysis.triple) {
    tags.push('<span class="tag">對子</span>');
  }
  if (analysis.straight) {
    tags.push('<span class="tag">順子</span>');
  }

  const diff =
    previousSum === null
      ? "首局"
      : `較上局 ${formatSigned(analysis.sum - previousSum, 0)}`;

  return `
    <li class="${formatOutcomeClass(record.outcome)}">
      <span class="round-num">#${record.index}</span>
      <span class="roll-values">${values}</span>
      <span class="roll-sum">${analysis.sum}</span>
      <span class="roll-tags">${tags.join("")}</span>
      <span class="round-meta">${formatClock(record.endedAt)} · ${diff}</span>
    </li>
  `;
}

export function renderHistory(container, history, options = {}) {
  const stats = options.stats ?? calculateStatistics(history);
  const records = stats.roundRecords;
  const activeFilter = HISTORY_FILTERS.some((filter) => filter.key === options.filter)
    ? options.filter
    : "all";

  if (records.length === 0) {
    container.innerHTML = `
      <div class="panel-head">
        <h2 class="panel-title">對局紀錄</h2>
      </div>
      <p>尚無紀錄</p>
    `;
    return;
  }

  const visible = records.filter((record) => matchesFilter(record, activeFilter));
  const rows = [...visible]
    .reverse()
    .map((record) => {
      const previous = records[record.index - 2];
      const previousSum = previous?.complete ? previous.analysis.sum : null;
      return buildRecordRow(record, previousSum);
    })
    .join("");

  const body = rows === "" ? `<p>此篩選條件尚無紀錄</p>` : `<ul class="history-list">${rows}</ul>`;

  container.innerHTML = `
    <div class="panel-head">
      <h2 class="panel-title">對局紀錄</h2>
      <span class="count-pill">${visible.length} / ${records.length} 局</span>
    </div>
    ${buildFilterBar(records, activeFilter)}
    ${body}
  `;
}

export function renderThemePicker(activeTheme) {
  const chips = THEMES.map(
    (theme) =>
      `<button type="button" class="theme-chip${theme.key === activeTheme ? " is-active" : ""}" data-theme-key="${theme.key}" title="${theme.label}"><span class="theme-swatch swatch-${theme.key}"></span>${theme.label}</button>`,
  ).join("");

  return `<div class="theme-bar">${chips}</div>`;
}

export function renderStatusChip(stats) {
  if (stats.totalRolls === 0) {
    return "等待第一顆骰子";
  }
  return `${stats.completedRounds} 局完成 · ${stats.totalRolls} 顆骰 · 平均 ${stats.averageSum.toFixed(2)} 點`;
}

export function renderCurrentRound(stats) {
  const pending = stats.roundRecords.find((record) => !record.complete);

  if (!pending) {
    return `
      <h3 class="stat-heading">本局進度</h3>
      <p class="side-empty">上一局已完成，開始新的一局吧。</p>
    `;
  }

  const slots = Array.from({ length: 3 }, (_value, index) => {
    const value = pending.rolls[index];
    return value === undefined
      ? `<span class="slot empty-slot">?</span>`
      : `<span class="slot"><img src="dice/dice${value}.png" width="34" height="34" alt="${value}"></span>`;
  }).join("");

  const partial = pending.rolls.reduce((total, value) => total + value, 0);

  return `
    <h3 class="stat-heading">本局進度</h3>
    <div class="slot-row">${slots}</div>
    <p class="stat-note">第 ${pending.index} 局 · 已投 ${pending.rolls.length}/3 · 目前累計 ${partial} 點</p>
  `;
}

export function renderQuickStats(stats) {
  if (stats.completedRounds === 0) {
    return `
      <h3 class="stat-heading">即時快覽</h3>
      <p class="side-empty">完成一局後顯示即時指標。</p>
    `;
  }

  const cards = [
    statCard("大", `${formatPercent(stats.outcomeRates.big, 1)}`, `${stats.outcomeCounts.big} 局`),
    statCard("小", `${formatPercent(stats.outcomeRates.small, 1)}`, `${stats.outcomeCounts.small} 局`),
    statCard("豹子", stats.outcomeCounts.triple, formatGap(stats.gaps.triple)),
    statCard("熱門骰", stats.hotNumbers.join("、"), `冷門 ${stats.coldNumbers.join("、")}`),
  ].join("");

  return `
    <h3 class="stat-heading">即時快覽</h3>
    <div class="stat-grid">${cards}</div>
  `;
}
