import { formatPercent } from "./format.js";

export function meterRow(label, count, rate, options = {}) {
  const { tone = "", markerRate = null, meta = null } = options;
  const marker =
    markerRate === null
      ? ""
      : `<span class="meter-marker" style="left: ${clampPercent(markerRate)}%" title="理論值 ${formatPercent(markerRate)}"></span>`;

  return `
    <li class="meter-row">
      <span class="meter-label">${label}</span>
      <div class="meter-track" aria-hidden="true">
        <div class="meter-fill ${tone}" style="width: ${clampPercent(rate)}%"></div>
        ${marker}
      </div>
      <span class="meter-meta">${meta ?? `${count} (${formatPercent(rate)})`}</span>
    </li>
  `;
}

export function clampPercent(rate) {
  return Math.min(Math.max(rate, 0), 1) * 100;
}

export function columnChart(items, options = {}) {
  const { highlight = null } = options;
  const peak = Math.max(...items.map((item) => item.value), 0);

  const columns = items
    .map((item) => {
      const height = peak === 0 ? 0 : (item.value / peak) * 100;
      const expected = item.expected === undefined ? "" : `<span class="column-ghost" style="height: ${peak === 0 ? 0 : Math.min((item.expected / peak) * 100, 100)}%"></span>`;
      const active = item.label === highlight ? " is-active" : "";
      return `
        <div class="column${active}" title="${item.title}">
          <div class="column-stack">
            ${expected}
            <span class="column-bar" style="height: ${height}%"></span>
          </div>
          <span class="column-value">${item.value}</span>
          <span class="column-label">${item.label}</span>
        </div>
      `;
    })
    .join("");

  return `<div class="column-chart">${columns}</div>`;
}

export function sparkline(values, options = {}) {
  const { baseline = null, width = 320, height = 72 } = options;

  if (values.length < 2) {
    return `<p class="empty small-note">再記錄 ${2 - values.length} 局即可產生趨勢線</p>`;
  }

  const min = Math.min(...values, baseline ?? Infinity);
  const max = Math.max(...values, baseline ?? -Infinity);
  const span = max - min === 0 ? 1 : max - min;
  const step = width / (values.length - 1);

  const toPoint = (value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  const points = values.map(toPoint).join(" ");
  const area = `0,${height} ${points} ${width},${height}`;
  const baselineY =
    baseline === null ? null : (height - ((baseline - min) / span) * height).toFixed(1);
  const baselineLine =
    baselineY === null
      ? ""
      : `<line class="spark-baseline" x1="0" y1="${baselineY}" x2="${width}" y2="${baselineY}" />`;

  return `
    <svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="和值趨勢">
      <polygon class="spark-area" points="${area}" />
      ${baselineLine}
      <polyline class="spark-line" points="${points}" />
    </svg>
  `;
}

export function heatGrid(matrix, options = {}) {
  const { rowLabels, columnLabels, caption = "" } = options;
  const peak = Math.max(...matrix.flat(), 0);

  const header = `<tr><th scope="col"></th>${columnLabels
    .map((label) => `<th scope="col">${label}</th>`)
    .join("")}</tr>`;

  const body = matrix
    .map((row, rowIndex) => {
      const cells = row
        .map((value) => {
          const intensity = peak === 0 ? 0 : value / peak;
          return `<td style="--heat: ${intensity.toFixed(3)}"><span>${value}</span></td>`;
        })
        .join("");
      return `<tr><th scope="row">${rowLabels[rowIndex]}</th>${cells}</tr>`;
    })
    .join("");

  return `
    <table class="heat-grid">
      ${caption === "" ? "" : `<caption>${caption}</caption>`}
      <thead>${header}</thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

export function beadRoad(outcomes, options = {}) {
  const { limit = 60, rows = 6 } = options;

  if (outcomes.length === 0) {
    return `<p class="empty small-note">尚無路單資料</p>`;
  }

  const visible = outcomes.slice(-limit);
  const beads = visible
    .map((outcome, index) => {
      const offset = outcomes.length - visible.length + index + 1;
      return `<span class="bead bead-${outcome}" title="第 ${offset} 局">${beadFace(outcome)}</span>`;
    })
    .join("");

  return `<div class="bead-road" style="grid-template-rows: repeat(${rows}, 1fr)">${beads}</div>`;
}

function beadFace(outcome) {
  switch (outcome) {
    case "big":
      return "大";
    case "small":
      return "小";
    default:
      return "豹";
  }
}
