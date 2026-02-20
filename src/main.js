(function () {
  const ROUND_SIZE = 3;
  const DIE_MIN = 1;
  const DIE_MAX = 6;
  const STORAGE_KEY = "dice_history";

  function toValidRoll(value) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < DIE_MIN || number > DIE_MAX) {
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

  function cloneRound(round) {
    return { rolls: round.rolls.slice() };
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

  function normalizeRound(round) {
    if (!round || typeof round !== "object") {
      return null;
    }

    let rolls = [];

    if (Array.isArray(round.rolls)) {
      for (const value of round.rolls) {
        const roll = toValidRoll(value);
        if (roll === null) {
          continue;
        }
        rolls.push(roll);
        if (rolls.length === ROUND_SIZE) {
          break;
        }
      }
    } else {
      rolls = toLegacyRolls(round);
    }

    if (rolls.length === 0) {
      return null;
    }

    return { rolls };
  }

  function normalizeHistory(rawHistory) {
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

  function isRoundComplete(round) {
    return Array.isArray(round?.rolls) && round.rolls.length === ROUND_SIZE;
  }

  function addRoll(history, value) {
    const roll = assertValidRoll(value);
    const normalized = normalizeHistory(history);
    const updated = normalized.map(cloneRound);
    const latestRound = updated[updated.length - 1];

    if (!latestRound || isRoundComplete(latestRound)) {
      updated.push({ rolls: [roll] });
      return updated;
    }

    latestRound.rolls.push(roll);
    return updated;
  }

  function undoLastRoll(history) {
    const normalized = normalizeHistory(history);
    if (normalized.length === 0) {
      return [];
    }

    const updated = normalized.map(cloneRound);
    const latestRound = updated[updated.length - 1];

    if (latestRound.rolls.length <= 1) {
      updated.pop();
    } else {
      latestRound.rolls = latestRound.rolls.slice(0, -1);
    }

    return updated;
  }

  function getCompletedRounds(history) {
    return normalizeHistory(history).filter(isRoundComplete);
  }

  function getAllRolls(history) {
    return normalizeHistory(history).flatMap((round) => round.rolls);
  }

  function buildCountMap(start, end) {
    const map = {};
    for (let value = start; value <= end; value += 1) {
      map[value] = 0;
    }
    return map;
  }

  function toRate(count, total) {
    if (total === 0) {
      return 0;
    }
    return count / total;
  }

  function isStraight(rolls) {
    const sorted = rolls.slice().sort((a, b) => a - b);
    return sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2];
  }

  function getHotAndColdNumbers(faceCounts, totalRolls) {
    if (totalRolls === 0) {
      return {
        hotNumbers: [],
        coldNumbers: [],
      };
    }

    const maxCount = Math.max.apply(null, faceCounts);
    const minCount = Math.min.apply(null, faceCounts);
    const hotNumbers = [];
    const coldNumbers = [];

    for (let index = 0; index < 6; index += 1) {
      if (faceCounts[index] === maxCount) {
        hotNumbers.push(index + 1);
      }
      if (faceCounts[index] === minCount) {
        coldNumbers.push(index + 1);
      }
    }

    return { hotNumbers, coldNumbers };
  }

  function getBigSmallStreak(analyses) {
    let currentType = null;
    let currentLength = 0;
    let longestBig = 0;
    let longestSmall = 0;

    for (const entry of analyses) {
      if (!entry.sizeType) {
        currentType = null;
        currentLength = 0;
        continue;
      }

      if (entry.sizeType === currentType) {
        currentLength += 1;
      } else {
        currentType = entry.sizeType;
        currentLength = 1;
      }

      if (entry.sizeType === "big") {
        longestBig = Math.max(longestBig, currentLength);
      }

      if (entry.sizeType === "small") {
        longestSmall = Math.max(longestSmall, currentLength);
      }
    }

    return {
      currentType,
      currentLength,
      longestBig,
      longestSmall,
    };
  }

  function analyzeCompletedRound(round) {
    const first = round.rolls[0];
    const second = round.rolls[1];
    const third = round.rolls[2];
    const sum = first + second + third;
    const triple = first === second && second === third;
    const uniqueCount = new Set(round.rolls).size;

    return {
      sum,
      triple,
      double: uniqueCount === 2,
      straight: uniqueCount === 3 && isStraight(round.rolls),
      parity: sum % 2 === 0 ? "even" : "odd",
      sizeType: triple ? null : sum > 10 ? "big" : "small",
    };
  }

  function calculateStatistics(history) {
    const allRolls = getAllRolls(history);
    const completedRounds = getCompletedRounds(history);
    const totalRolls = allRolls.length;
    const completedCount = completedRounds.length;
    const faceCounts = [0, 0, 0, 0, 0, 0];

    for (const value of allRolls) {
      faceCounts[value - 1] += 1;
    }

    const faceRates = faceCounts.map((count) => toRate(count, totalRolls));
    const outcomeCounts = { big: 0, small: 0, triple: 0 };
    const parityCounts = { odd: 0, even: 0 };
    const patternCounts = { double: 0, triple: 0, straight: 0 };
    const sumCounts = buildCountMap(3, 18);
    const recentOutcomes = [];
    const analyzedRounds = completedRounds.map(analyzeCompletedRound);

    for (const round of analyzedRounds) {
      sumCounts[round.sum] += 1;
      parityCounts[round.parity] += 1;

      if (round.triple) {
        outcomeCounts.triple += 1;
        patternCounts.triple += 1;
        recentOutcomes.push("triple");
      } else {
        outcomeCounts[round.sizeType] += 1;
        recentOutcomes.push(round.sizeType);
      }

      if (round.double) {
        patternCounts.double += 1;
      }

      if (round.straight) {
        patternCounts.straight += 1;
      }
    }

    const sumRates = buildCountMap(3, 18);
    for (let sum = 3; sum <= 18; sum += 1) {
      sumRates[sum] = toRate(sumCounts[sum], completedCount);
    }

    const outcomeRates = {
      big: toRate(outcomeCounts.big, completedCount),
      small: toRate(outcomeCounts.small, completedCount),
      triple: toRate(outcomeCounts.triple, completedCount),
    };

    const parityRates = {
      odd: toRate(parityCounts.odd, completedCount),
      even: toRate(parityCounts.even, completedCount),
    };

    const patternRates = {
      double: toRate(patternCounts.double, completedCount),
      triple: toRate(patternCounts.triple, completedCount),
      straight: toRate(patternCounts.straight, completedCount),
    };

    const sumTotal = analyzedRounds.reduce((accumulator, round) => accumulator + round.sum, 0);
    const averageSum = completedCount === 0 ? 0 : sumTotal / completedCount;
    const streak = getBigSmallStreak(analyzedRounds);
    const roundsInProgressRolls = totalRolls - completedCount * 3;
    const hotCold = getHotAndColdNumbers(faceCounts, totalRolls);

    return {
      totalRolls,
      totalRounds: Math.ceil(totalRolls / 3),
      completedRounds: completedCount,
      inProgressRolls: roundsInProgressRolls,
      averageSum,
      faceCounts,
      faceRates,
      outcomeCounts,
      outcomeRates,
      parityCounts,
      parityRates,
      patternCounts,
      patternRates,
      sumCounts,
      sumRates,
      streak,
      hotNumbers: hotCold.hotNumbers,
      coldNumbers: hotCold.coldNumbers,
      recentOutcomes: recentOutcomes.slice(-10),
    };
  }

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

  function renderHistory(container, history) {
    const rounds = normalizeHistory(history);

    if (rounds.length === 0) {
      container.innerHTML = '<h2>歷史紀錄</h2><p class="empty">尚無紀錄</p>';
      return;
    }

    const rows = rounds
      .slice()
      .reverse()
      .map((round) => {
        const values = round.rolls.map((value) => `<b>${value}</b>`).join(" ");

        if (!isRoundComplete(round)) {
          return `<li>${values} 進行中 (${round.rolls.length}/3)</li>`;
        }

        const analyzed = analyzeCompletedRound(round);
        const cssClass = analyzed.triple ? "sp" : analyzed.sizeType === "big" ? "large" : "small";
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

  function renderStatistics(container, stats) {
    if (stats.totalRolls === 0) {
      container.innerHTML = '<h2>統計面板</h2><p class="empty">尚無統計資料</p>';
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

  function getStorageItem(storage, key) {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  function parseStoredHistory(storage, key) {
    if (!storage) {
      return [];
    }

    const raw = getStorageItem(storage, key);
    if (!raw) {
      return [];
    }

    try {
      return normalizeHistory(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  function persistHistory(storage, key, history) {
    if (!storage) {
      return;
    }
    try {
      storage.setItem(key, JSON.stringify(history));
    } catch {
      return;
    }
  }

  function clearHistory(storage, key) {
    if (!storage) {
      return;
    }
    try {
      storage.removeItem(key);
    } catch {
      return;
    }
  }

  function createDiceButtons(panel, doc, onAdd) {
    panel.innerHTML = "";

    for (let value = 1; value <= 6; value += 1) {
      const button = doc.createElement("button");
      button.type = "button";
      button.className = "dice-btn";
      button.dataset.value = String(value);
      button.setAttribute("aria-label", `記錄骰子 ${value}`);

      const image = doc.createElement("img");
      image.src = `dice/dice${value}.png`;
      image.alt = `dice${value}`;
      image.width = 56;
      image.height = 56;

      const label = doc.createElement("span");
      label.className = "dice-value";
      label.textContent = `${value} 點`;

      button.appendChild(image);
      button.appendChild(label);
      button.addEventListener("click", () => onAdd(value));
      panel.appendChild(button);
    }
  }

  function createDiceApp(options) {
    const documentRef = options?.document;
    const storage = options?.storage ?? null;
    const storageKey = options?.storageKey ?? STORAGE_KEY;

    if (!documentRef) {
      throw new Error("Document is required.");
    }

    const dicePanel = documentRef.querySelector(".dicePanel");
    const historiesDiv = documentRef.querySelector(".histories");
    const statsDiv = documentRef.querySelector(".probability");
    const resetButton = documentRef.getElementById("btnReset");
    const undoButton = documentRef.getElementById("btnUndo");
    const liveRegion = documentRef.getElementById("liveRegion");

    if (!dicePanel || !historiesDiv || !statsDiv || !resetButton || !undoButton) {
      throw new Error("Required UI elements are missing.");
    }

    let history = parseStoredHistory(storage, storageKey);

    function announce(message) {
      if (!liveRegion) {
        return;
      }
      liveRegion.textContent = message;
    }

    function renderAll() {
      renderHistory(historiesDiv, history);
      renderStatistics(statsDiv, calculateStatistics(history));
      undoButton.disabled = history.length === 0;
    }

    function add(value) {
      history = addRoll(history, value);
      persistHistory(storage, storageKey, history);
      renderAll();
      announce(`已新增骰子 ${value}。`);
    }

    function undo() {
      history = undoLastRoll(history);
      if (history.length === 0) {
        clearHistory(storage, storageKey);
      } else {
        persistHistory(storage, storageKey, history);
      }
      renderAll();
      announce("已撤銷最新一筆。");
    }

    function reset() {
      history = [];
      clearHistory(storage, storageKey);
      renderAll();
      announce("已清空所有紀錄。");
    }

    createDiceButtons(dicePanel, documentRef, add);

    resetButton.addEventListener("click", reset);
    undoButton.addEventListener("click", undo);

    renderAll();
  }

  function getSafeStorage() {
    try {
      const storage = window.localStorage;
      const probeKey = "__dice_storage_probe__";
      storage.setItem(probeKey, "ok");
      storage.removeItem(probeKey);
      return storage;
    } catch {
      return null;
    }
  }

  function bootstrap() {
    try {
      createDiceApp({
        document: window.document,
        storage: getSafeStorage(),
      });
    } catch (error) {
      const panel = window.document.querySelector(".dicePanel");
      if (panel) {
        panel.innerHTML = '<p class="empty">初始化失敗，請重新整理頁面。</p>';
      }
      console.error(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
