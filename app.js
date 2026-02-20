import {
  THEORETICAL,
  chiSquareUniform,
  classifyRound,
  computeSessionStats,
  exportSessionCsv,
  formatFileTime,
  formatTime,
  safeFilename,
  buildSummaryText,
} from "./core.js";
import {
  createRound,
  createSession,
  loadState,
  mergeImported,
  normalizeImported,
  saveState,
} from "./storage.js";

export function startApp(env = {}) {
  const doc = env.document ?? globalThis.document;
  const storage = env.storage ?? globalThis.localStorage;
  const promptFn = env.prompt ?? globalThis.prompt;
  const confirmFn = env.confirm ?? globalThis.confirm;
  const clipboard = env.clipboard ?? globalThis.navigator?.clipboard;
  const downloadText = env.downloadText ?? defaultDownloadText;
  const nowIso = env.nowIso;
  const idGen = env.idGen;
  const getNowIso = nowIso ?? (() => new Date().toISOString());

  if (!doc) throw new Error("startApp: missing document");
  if (!storage) throw new Error("startApp: missing storage");

  const $ = (selector) => {
    const el = doc.querySelector(selector);
    if (!el) throw new Error(`Missing element: ${selector}`);
    return el;
  };

  const els = {
    sessionSelect: /** @type {HTMLSelectElement} */ ($("#sessionSelect")),
    btnNewSession: /** @type {HTMLButtonElement} */ ($("#btnNewSession")),
    btnRenameSession: /** @type {HTMLButtonElement} */ ($("#btnRenameSession")),
    btnDeleteSession: /** @type {HTMLButtonElement} */ ($("#btnDeleteSession")),
    dicePad: /** @type {HTMLDivElement} */ ($("#dicePad")),
    draftDice: /** @type {HTMLDivElement} */ ($("#draftDice")),
    draftMeta: /** @type {HTMLDivElement} */ ($("#draftMeta")),
    btnUndo: /** @type {HTMLButtonElement} */ ($("#btnUndo")),
    btnClearDraft: /** @type {HTMLButtonElement} */ ($("#btnClearDraft")),
    btnResetSession: /** @type {HTMLButtonElement} */ ($("#btnResetSession")),
    btnExportJson: /** @type {HTMLButtonElement} */ ($("#btnExportJson")),
    btnExportCsv: /** @type {HTMLButtonElement} */ ($("#btnExportCsv")),
    fileImport: /** @type {HTMLInputElement} */ ($("#fileImport")),
    statsSummary: /** @type {HTMLDivElement} */ ($("#statsSummary")),
    faceStats: /** @type {HTMLDivElement} */ ($("#faceStats")),
    chiSquare: /** @type {HTMLDivElement} */ ($("#chiSquare")),
    sumStats: /** @type {HTMLDivElement} */ ($("#sumStats")),
    sumMoments: /** @type {HTMLDivElement} */ ($("#sumMoments")),
    resultStats: /** @type {HTMLDivElement} */ ($("#resultStats")),
    streakStats: /** @type {HTMLDivElement} */ ($("#streakStats")),
    oddEvenStats: /** @type {HTMLDivElement} */ ($("#oddEvenStats")),
    pairStats: /** @type {HTMLDivElement} */ ($("#pairStats")),
    doubleStats: /** @type {HTMLDivElement} */ ($("#doubleStats")),
    patternTop: /** @type {HTMLOListElement} */ ($("#patternTop")),
    filterSelect: /** @type {HTMLSelectElement} */ ($("#filterSelect")),
    btnCopySummary: /** @type {HTMLButtonElement} */ ($("#btnCopySummary")),
    historyList: /** @type {HTMLOListElement} */ ($("#historyList")),
  };

  const toastEl = env.toastEl ?? createToast(doc);
  let toastTimer = /** @type {number | undefined} */ (undefined);

  /** @type {ReturnType<typeof loadState>} */
  const state = loadState(storage, {
    nowIso: nowIso ?? undefined,
    idGen: idGen ?? undefined,
  });

  ensureSessionExists();
  buildDicePad();
  wireEvents();
  refreshSessionSelect();
  renderAll();

  return {
    getState: () => structuredCloneSafe(state),
    addDie,
    undo,
    deleteRound,
    renderAll,
  };

  function ensureSessionExists() {
    if (!Object.keys(state.sessions).length) {
      const s = createSession("預設", {
        nowIso: nowIso ?? undefined,
        idGen: idGen ?? undefined,
      });
      state.sessions[s.id] = s;
      state.currentSessionId = s.id;
      save();
      return;
    }
    if (!state.sessions[state.currentSessionId]) {
      state.currentSessionId = Object.keys(state.sessions)[0];
      save();
    }
  }

  function getSession() {
    const s = state.sessions[state.currentSessionId];
    if (!s) throw new Error("Missing current session");
    return s;
  }

  function save() {
    saveState(storage, state);
  }

  function showToast(msg) {
    if (toastTimer) globalThis.clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    const t = globalThis.setTimeout(() => {
      toastEl.classList.remove("show");
    }, 1600);

    // Avoid keeping Node.js test runner alive.
    if (t && typeof t === "object" && "unref" in t && typeof t.unref === "function") {
      t.unref();
    }
    toastTimer = t;
  }

  function buildDicePad() {
    els.dicePad.innerHTML = "";
    for (let i = 1; i <= 6; i++) {
      const btn = doc.createElement("button");
      btn.type = "button";
      btn.className = "diceBtn";
      btn.setAttribute("data-face", String(i));
      btn.setAttribute("aria-label", `輸入 ${i}`);

      const img = doc.createElement("img");
      img.src = `dice/dice${i}.png`;
      img.alt = String(i);
      img.width = 128;
      img.height = 128;
      btn.appendChild(img);
      els.dicePad.appendChild(btn);
    }
  }

  function wireEvents() {
    els.dicePad.addEventListener("click", (e) => {
      const target = /** @type {HTMLElement | null} */ (e.target);
      const btn =
        target?.closest?.("button[data-face]") ??
        (target && typeof target.getAttribute === "function" && target.getAttribute("data-face")
          ? target
          : null);
      if (!btn) return;
      const face = Number(btn.getAttribute("data-face"));
      if (!Number.isInteger(face) || face < 1 || face > 6) return;
      addDie(face);
    });

    els.sessionSelect.addEventListener("change", () => {
      state.currentSessionId = els.sessionSelect.value;
      state.draft = [];
      save();
      renderAll();
    });

    els.btnNewSession.addEventListener("click", () => {
      const name = promptFn?.("新局名稱：", `局 ${new Date().toLocaleString()}`);
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const s = createSession(trimmed, {
        nowIso: nowIso ?? undefined,
        idGen: idGen ?? undefined,
      });
      state.sessions[s.id] = s;
      state.currentSessionId = s.id;
      state.draft = [];
      save();
      refreshSessionSelect();
      renderAll();
      showToast("已建立新局");
    });

    els.btnRenameSession.addEventListener("click", () => {
      const s = getSession();
      const name = promptFn?.("改名：", s.name);
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      s.name = trimmed;
      s.updatedAt = getNowIso();
      save();
      refreshSessionSelect();
      renderAll();
      showToast("已更新名稱");
    });

    els.btnDeleteSession.addEventListener("click", () => {
      const s = getSession();
      const ok = confirmFn?.(
        `確定刪除「${s.name}」？\n\n這個動作無法復原。`,
      );
      if (!ok) return;

      delete state.sessions[s.id];
      state.draft = [];
      ensureSessionExists();
      save();
      refreshSessionSelect();
      renderAll();
      showToast("已刪除");
    });

    els.btnUndo.addEventListener("click", () => {
      undo();
    });

    els.btnClearDraft.addEventListener("click", () => {
      state.draft = [];
      save();
      renderAll();
    });

    els.btnResetSession.addEventListener("click", () => {
      const s = getSession();
      const ok = confirmFn?.(
        `清空本局「${s.name}」的所有紀錄？\n\n建議先匯出 JSON 備份。`,
      );
      if (!ok) return;
      s.rounds = [];
      s.updatedAt = getNowIso();
      state.draft = [];
      save();
      renderAll();
      showToast("已清空本局");
    });

    els.btnExportJson.addEventListener("click", () => {
      const text = JSON.stringify(state, null, 2);
      const filename = `df-dice-backup-${formatFileTime(new Date())}.json`;
      downloadText(filename, text, "application/json");
      showToast("已匯出 JSON");
    });

    els.btnExportCsv.addEventListener("click", () => {
      const s = getSession();
      const csv = exportSessionCsv(s);
      const filename = `df-dice-${safeFilename(s.name)}-${formatFileTime(new Date())}.csv`;
      downloadText(filename, csv, "text/csv");
      showToast("已匯出 CSV");
    });

    els.fileImport.addEventListener("change", async () => {
      const file = els.fileImport.files?.[0];
      els.fileImport.value = "";
      if (!file) return;

      try {
        const text = await file.text();
        const raw = JSON.parse(text);
        const imported = normalizeImported(raw, {
          nowIso: nowIso ?? undefined,
          idGen: idGen ?? undefined,
        });

        if (!imported.sessions.length) {
          alert("匯入失敗：檔案格式不正確。");
          return;
        }

        const ok = confirmFn?.(
          `匯入資料會新增 ${imported.sessions.length} 個局到目前瀏覽器（不會覆蓋）。\n\n確定要匯入嗎？`,
        );
        if (!ok) return;

        mergeImported(state, imported, { idGen: idGen ?? undefined });
        save();
        refreshSessionSelect();
        renderAll();
        showToast("匯入完成");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`匯入失敗：${msg}`);
      }
    });

    els.filterSelect.addEventListener("change", () => {
      state.ui.filter = els.filterSelect.value;
      save();
      renderHistory();
    });

    els.btnCopySummary.addEventListener("click", async () => {
      const s = getSession();
      const summary = buildSummaryText(s);

      try {
        if (!clipboard?.writeText) throw new Error("clipboard unavailable");
        await clipboard.writeText(summary);
        showToast("已複製到剪貼簿");
      } catch {
        showToast("複製失敗（瀏覽器限制）");
        alert(summary);
      }
    });

    els.historyList.addEventListener("click", (e) => {
      const target = /** @type {HTMLElement | null} */ (e.target);
      const btn =
        target?.closest?.("button[data-action]") ??
        (target && typeof target.getAttribute === "function" && target.getAttribute("data-action")
          ? target
          : null);
      if (!btn) return;
      if (btn.getAttribute("data-action") !== "delete") return;
      const id = btn.getAttribute("data-round-id");
      if (!id) return;
      deleteRound(id);
    });

    doc.addEventListener("keydown", (e) => {
      const active = doc.activeElement;
      const tag =
        active && typeof active === "object" && "tagName" in active
          ? String(active.tagName).toUpperCase()
          : "";
      const isEditable =
        active && typeof active === "object" && "isContentEditable" in active
          ? Boolean(active.isContentEditable)
          : false;

      if (tag === "INPUT" || tag === "TEXTAREA" || isEditable) {
        return;
      }

      if (e.key >= "1" && e.key <= "6") {
        addDie(Number(e.key));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        undo();
      } else if (e.key === "Escape") {
        state.draft = [];
        save();
        renderAll();
      }
    });
  }

  function addDie(face) {
    state.draft.push(face);
    if (state.draft.length >= 3) {
      const dice = /** @type {[number, number, number]} */ (state.draft.slice(0, 3));
      const round = createRound(dice, {
        nowIso: nowIso ?? undefined,
        idGen: idGen ?? undefined,
      });
      const s = getSession();
      s.rounds.push(round);
      s.updatedAt = round.at;
      state.draft = [];
    }
    save();
    renderAll();
  }

  function undo() {
    if (state.draft.length) {
      state.draft.pop();
      save();
      renderAll();
      return;
    }

    const s = getSession();
    if (!s.rounds.length) return;
    s.rounds.pop();
    s.updatedAt = getNowIso();
    save();
    renderAll();
  }

  function deleteRound(roundId) {
    const s = getSession();
    const next = s.rounds.filter((r) => r.id !== roundId);
    if (next.length === s.rounds.length) return;
    s.rounds = next;
    s.updatedAt = getNowIso();
    save();
    renderAll();
  }

  function renderAll() {
    els.filterSelect.value = state.ui.filter;
    renderDraft();
    renderStats();
    renderHistory();
  }

  function renderDraft() {
    els.draftDice.innerHTML = state.draft
      .map((face) => `<img src="dice/dice${face}.png" alt="${face}" width="44" height="44" />`)
      .join("");

    const remain = 3 - state.draft.length;
    if (remain === 3) {
      els.draftMeta.textContent = "點骰子開始記錄。";
    } else {
      els.draftMeta.textContent = `還差 ${remain} 顆骰。`;
    }
  }

  function renderStats() {
    const s = getSession();
    const stats = computeSessionStats(s.rounds);

    els.statsSummary.textContent =
      stats.totalRounds === 0
        ? "尚無紀錄"
        : `共 ${stats.totalRounds} 回合 / ${stats.totalDice} 顆骰 | 平均和值 ${stats.sumMoments.mean.toFixed(2)} (σ ${stats.sumMoments.std.toFixed(2)})`;

    renderFaceStats(stats);
    renderSumStats(stats);
    renderResultStats(stats);
    renderOddEvenStats(stats);
    renderPairStats(stats);
    renderPatternTop(stats);
  }

  function renderFaceStats(stats) {
    els.faceStats.innerHTML = "";

    const max = Math.max(1, ...stats.faceCounts);
    for (let face = 1; face <= 6; face++) {
      const count = stats.faceCounts[face - 1];
      const pct = stats.totalDice ? (count / stats.totalDice) * 100 : 0;
      const barPct = (count / max) * 100;

      const row = doc.createElement("div");
      row.className = "statRow";

      const icon = doc.createElement("img");
      icon.src = `dice/dice${face}.png`;
      icon.alt = String(face);
      icon.width = 20;
      icon.height = 20;

      const bar = doc.createElement("div");
      bar.className = "bar";
      const barInner = doc.createElement("div");
      barInner.style.width = `${barPct}%`;
      bar.appendChild(barInner);

      const value = doc.createElement("div");
      value.className = "historyTime";
      value.textContent = `${pct.toFixed(2)}% (${count})`;

      row.appendChild(icon);
      row.appendChild(bar);
      row.appendChild(value);
      els.faceStats.appendChild(row);
    }

    if (stats.totalDice < 30) {
      els.chiSquare.textContent = "偏骰檢查：樣本太少（建議至少 30 顆骰以上再看）。";
      return;
    }

    const chi2 = chiSquareUniform(stats.faceCounts);
    const line = [`偏骰檢查：χ²(df=5)=${chi2.toFixed(2)}`];
    if (chi2 >= 20.515) {
      line.push("(p < 0.001) 高度可疑");
    } else if (chi2 >= 15.086) {
      line.push("(p < 0.01) 可疑");
    } else if (chi2 >= 11.07) {
      line.push("(p < 0.05) 可能偏骰");
    } else {
      line.push("(p ≥ 0.05) 目前看起來正常");
    }
    els.chiSquare.textContent = line.join(" ");
  }

  function renderSumStats(stats) {
    els.sumStats.innerHTML = "";

    const max = Math.max(1, ...stats.sumCounts.slice(3, 19));
    for (let sum = 3; sum <= 18; sum++) {
      const count = stats.sumCounts[sum];
      const pct = stats.totalRounds ? (count / stats.totalRounds) * 100 : 0;
      const barPct = (count / max) * 100;
      const expectedPct =
        (THEORETICAL.sumCounts[sum] / THEORETICAL.outcomes) * 100;

      const row = doc.createElement("div");
      row.className = "statRow";

      const label = doc.createElement("div");
      label.className = "statLabel";
      label.textContent = String(sum);

      const bar = doc.createElement("div");
      bar.className = "bar";
      const barInner = doc.createElement("div");
      barInner.style.width = `${barPct}%`;
      bar.appendChild(barInner);

      const value = doc.createElement("div");
      value.className = "historyTime";
      value.textContent = `${pct.toFixed(2)}% (${count})`;
      value.title = `期望 ${expectedPct.toFixed(2)}%`;

      row.appendChild(label);
      row.appendChild(bar);
      row.appendChild(value);
      els.sumStats.appendChild(row);
    }

    if (!stats.totalRounds) {
      els.sumMoments.textContent = "";
      return;
    }

    const mean = stats.sumMoments.mean;
    const std = stats.sumMoments.std;
    els.sumMoments.textContent = `平均 ${mean.toFixed(2)} (理論 ${THEORETICAL.sumMoments.mean.toFixed(2)})；σ ${std.toFixed(2)} (理論 ${THEORETICAL.sumMoments.std.toFixed(2)})`;
  }

  function renderResultStats(stats) {
    els.resultStats.innerHTML = "";

    const blocks = [
      {
        label: "大",
        count: stats.big,
        expectedPct: (THEORETICAL.big / THEORETICAL.outcomes) * 100,
      },
      {
        label: "小",
        count: stats.small,
        expectedPct: (THEORETICAL.small / THEORETICAL.outcomes) * 100,
      },
      {
        label: "豹子",
        count: stats.triple,
        expectedPct: (THEORETICAL.triple / THEORETICAL.outcomes) * 100,
      },
    ];

    for (const b of blocks) {
      const pct = stats.totalRounds ? (b.count / stats.totalRounds) * 100 : 0;

      const row = doc.createElement("div");
      row.className = "statRow";

      const label = doc.createElement("div");
      label.className = "statLabel";
      label.textContent = b.label;

      const bar = doc.createElement("div");
      bar.className = "bar";
      const barInner = doc.createElement("div");
      barInner.style.width = `${pct}%`;
      bar.appendChild(barInner);

      const value = doc.createElement("div");
      value.className = "historyTime";
      value.textContent = `${pct.toFixed(2)}% (${b.count})`;
      value.title = `期望 ${b.expectedPct.toFixed(2)}%`;

      row.appendChild(label);
      row.appendChild(bar);
      row.appendChild(value);
      els.resultStats.appendChild(row);
    }

    const tripleLine = doc.createElement("div");
    tripleLine.className = "muted";
    const seg = [];
    for (let face = 1; face <= 6; face++) {
      seg.push(`${face}:${stats.tripleByFace[face - 1]}`);
    }
    tripleLine.textContent = `指定豹子：${seg.join(" | ")}`;
    els.resultStats.appendChild(tripleLine);

    els.streakStats.textContent =
      stats.totalRounds === 0
        ? ""
        : `目前連莊：${stats.currentStreak.label} x${stats.currentStreak.length}；最長：大 x${stats.longest.big} / 小 x${stats.longest.small} / 豹子 x${stats.longest.triple}`;
  }

  function renderOddEvenStats(stats) {
    els.oddEvenStats.innerHTML = "";
    const total = stats.odd + stats.even;
    const blocks = [
      {
        label: "單",
        count: stats.odd,
        expectedPct: (THEORETICAL.odd / (THEORETICAL.odd + THEORETICAL.even)) * 100,
      },
      {
        label: "雙",
        count: stats.even,
        expectedPct: (THEORETICAL.even / (THEORETICAL.odd + THEORETICAL.even)) * 100,
      },
    ];

    for (const b of blocks) {
      const pct = total ? (b.count / total) * 100 : 0;

      const row = doc.createElement("div");
      row.className = "statRow";

      const label = doc.createElement("div");
      label.className = "statLabel";
      label.textContent = b.label;

      const bar = doc.createElement("div");
      bar.className = "bar";
      const barInner = doc.createElement("div");
      barInner.style.width = `${pct}%`;
      bar.appendChild(barInner);

      const value = doc.createElement("div");
      value.className = "historyTime";
      value.textContent = `${pct.toFixed(2)}% (${b.count})`;
      value.title = `期望 ${b.expectedPct.toFixed(2)}%`;

      row.appendChild(label);
      row.appendChild(bar);
      row.appendChild(value);
      els.oddEvenStats.appendChild(row);
    }
  }

  function renderPairStats(stats) {
    els.pairStats.innerHTML = "";
    els.doubleStats.innerHTML = "";

    const blocks = [
      {
        label: "全不同",
        count: stats.pattern.distinct,
        expectedPct:
          (THEORETICAL.pattern.distinct / THEORETICAL.outcomes) * 100,
      },
      {
        label: "一對",
        count: stats.pattern.pair,
        expectedPct: (THEORETICAL.pattern.pair / THEORETICAL.outcomes) * 100,
      },
      {
        label: "豹子",
        count: stats.pattern.triple,
        expectedPct: (THEORETICAL.pattern.triple / THEORETICAL.outcomes) * 100,
      },
      {
        label: "任意對子",
        count: stats.pattern.anyDouble,
        expectedPct:
          (THEORETICAL.pattern.anyDouble / THEORETICAL.outcomes) * 100,
      },
    ];

    for (const b of blocks) {
      const pct = stats.totalRounds ? (b.count / stats.totalRounds) * 100 : 0;

      const row = doc.createElement("div");
      row.className = "statRow";

      const label = doc.createElement("div");
      label.className = "statLabel";
      label.textContent = b.label;

      const bar = doc.createElement("div");
      bar.className = "bar";
      const barInner = doc.createElement("div");
      barInner.style.width = `${pct}%`;
      bar.appendChild(barInner);

      const value = doc.createElement("div");
      value.className = "historyTime";
      value.textContent = `${pct.toFixed(2)}% (${b.count})`;
      value.title = `期望 ${b.expectedPct.toFixed(2)}%`;

      row.appendChild(label);
      row.appendChild(bar);
      row.appendChild(value);
      els.pairStats.appendChild(row);
    }

    const max = Math.max(1, ...stats.doubleByFace);
    for (let face = 1; face <= 6; face++) {
      const count = stats.doubleByFace[face - 1];
      const pct = stats.totalRounds ? (count / stats.totalRounds) * 100 : 0;
      const barPct = (count / max) * 100;
      const expectedPct =
        (THEORETICAL.doubleByFace[face - 1] / THEORETICAL.outcomes) * 100;

      const row = doc.createElement("div");
      row.className = "statRow";

      const icon = doc.createElement("img");
      icon.src = `dice/dice${face}.png`;
      icon.alt = String(face);
      icon.width = 20;
      icon.height = 20;

      const bar = doc.createElement("div");
      bar.className = "bar";
      const barInner = doc.createElement("div");
      barInner.style.width = `${barPct}%`;
      bar.appendChild(barInner);

      const value = doc.createElement("div");
      value.className = "historyTime";
      value.textContent = `${pct.toFixed(2)}% (${count})`;
      value.title = `期望 ${expectedPct.toFixed(2)}%`;

      row.appendChild(icon);
      row.appendChild(bar);
      row.appendChild(value);
      els.doubleStats.appendChild(row);
    }
  }

  function renderPatternTop(stats) {
    if (!stats.totalRounds) {
      els.patternTop.innerHTML = "<li>尚無紀錄</li>";
      return;
    }

    const entries = Object.entries(stats.multisetCounts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10);

    els.patternTop.innerHTML = entries
      .map(([key, count]) => {
        const pct = (count / stats.totalRounds) * 100;
        return `<li>${key} <span>${pct.toFixed(2)}% (${count})</span></li>`;
      })
      .join("");
  }

  function renderHistory() {
    const s = getSession();
    const filter = state.ui.filter;

    const filtered = s.rounds.filter((r) => {
      if (filter === "all") return true;
      return classifyRound(r.dice).type === filter;
    });

    const rounds = [...filtered].reverse();
    if (!rounds.length) {
      els.historyList.innerHTML = `<li class="muted" style="list-style:none; padding:8px 0 12px;">${
        s.rounds.length ? "沒有符合篩選條件的紀錄。" : "還沒有任何紀錄。"
      }</li>`;
      return;
    }

    els.historyList.innerHTML = rounds
      .map((round) => {
        const outcome = classifyRound(round.dice);
        const sum = round.dice[0] + round.dice[1] + round.dice[2];
        const time = formatTime(round.at);
        const diceImgs = round.dice
          .map(
            (face) =>
              `<img src="dice/dice${face}.png" alt="${face}" width="22" height="22" />`,
          )
          .join("");

        return `<li class="historyItem">
  <div class="historyTime">${time}</div>
  <div class="historyDice">${diceImgs}</div>
  <div class="historySum">${sum}</div>
  <div class="pill ${outcome.type}">${outcome.label}</div>
  <button type="button" class="historyDel" data-action="delete" data-round-id="${round.id}">刪</button>
</li>`;
      })
      .join("");
  }

  function refreshSessionSelect() {
    const sessions = Object.values(state.sessions).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
    els.sessionSelect.innerHTML = "";

    for (const s of sessions) {
      const opt = doc.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      els.sessionSelect.appendChild(opt);
    }

    els.sessionSelect.value = state.currentSessionId;
  }
}

function createToast(doc) {
  const el = doc.createElement("div");
  el.className = "toast";
  el.setAttribute("aria-live", "polite");
  doc.body.appendChild(el);
  return el;
}

function defaultDownloadText(filename, text, contentType) {
  const blob = new Blob([text], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
