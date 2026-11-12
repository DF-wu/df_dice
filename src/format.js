export const OUTCOME_LABELS = {
  big: "大",
  small: "小",
  triple: "豹子",
};

export const OUTCOME_CLASSES = {
  big: "large",
  small: "small",
  triple: "sp",
};

export const PARITY_LABELS = {
  odd: "單",
  even: "雙",
};

export function formatPercent(rate, digits = 2) {
  return `${(rate * 100).toFixed(digits)}%`;
}

export function formatSigned(value, digits = 2) {
  const rounded = Number(value.toFixed(digits));
  const prefix = rounded > 0 ? "+" : "";
  return `${prefix}${rounded.toFixed(digits)}`;
}

export function formatSignedPercent(rate, digits = 2) {
  return `${formatSigned(rate * 100, digits)}%`;
}

export function formatOutcomeLabel(outcome) {
  return OUTCOME_LABELS[outcome] ?? "-";
}

export function formatOutcomeClass(outcome) {
  return OUTCOME_CLASSES[outcome] ?? "";
}

export function formatParity(parity) {
  return PARITY_LABELS[parity] ?? "-";
}

export function formatGap(gap) {
  if (gap === null) {
    return "未出現";
  }
  if (gap === 0) {
    return "本局";
  }
  return `${gap} 局前`;
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return "-";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} 時 ${minutes} 分`;
  }
  if (minutes > 0) {
    return `${minutes} 分 ${seconds} 秒`;
  }
  return `${seconds} 秒`;
}

export function formatClock(timestamp) {
  if (timestamp === null) {
    return "--:--";
  }

  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatVerdict(verdict) {
  switch (verdict) {
    case "fair":
      return "分佈均勻";
    case "watch":
      return "略有偏斜";
    case "biased":
      return "明顯偏斜";
    default:
      return "樣本不足";
  }
}
