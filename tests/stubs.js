export function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      map.set(k, String(v));
    },
    removeItem: (k) => {
      map.delete(k);
    },
    clear: () => {
      map.clear();
    },
    _dump: () => Object.fromEntries(map.entries()),
  };
}

export class StubElement {
  constructor(tagName, { id } = {}) {
    this.tagName = tagName.toUpperCase();
    this.id = id || "";
    this.children = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.eventListeners = new Map();
    this.style = {};
    this.className = "";
    this.value = "";
    this.files = undefined;
    this.isContentEditable = false;

    this._textContent = "";
    this._innerHTML = "";
    this.classList = {
      add: (...names) => {
        const set = new Set(this.className.split(/\s+/).filter(Boolean));
        for (const n of names) set.add(n);
        this.className = [...set].join(" ");
      },
      remove: (...names) => {
        const set = new Set(this.className.split(/\s+/).filter(Boolean));
        for (const n of names) set.delete(n);
        this.className = [...set].join(" ");
      },
    };
  }

  setAttribute(k, v) {
    this.attributes.set(k, String(v));
  }

  getAttribute(k) {
    return this.attributes.has(k) ? this.attributes.get(k) : null;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
    this.parentElement = null;
  }

  addEventListener(type, handler) {
    const list = this.eventListeners.get(type) ?? [];
    list.push(handler);
    this.eventListeners.set(type, list);
  }

  dispatchEvent(event) {
    const list = this.eventListeners.get(event.type) ?? [];
    const results = [];
    for (const h of list) results.push(h(event));
    return Promise.all(results);
  }

  closest(selector) {
    const matches = (el) => {
      if (!(el instanceof StubElement)) return false;
      if (selector === "button[data-face]") {
        return el.tagName === "BUTTON" && el.getAttribute("data-face") !== null;
      }
      if (selector === "button[data-action]") {
        return el.tagName === "BUTTON" && el.getAttribute("data-action") !== null;
      }
      return false;
    };

    let cur = this;
    while (cur) {
      if (matches(cur)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  click() {
    return this.dispatchEvent({ type: "click", target: this, preventDefault() {} });
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(v) {
    this._textContent = String(v ?? "");
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(v) {
    this._innerHTML = String(v ?? "");
    this.children = [];
  }
}

export class StubDocument {
  constructor() {
    this._byId = new Map();
    this.eventListeners = new Map();
    this.body = new StubElement("body");
    this.activeElement = null;
  }

  register(el) {
    if (el.id) this._byId.set(el.id, el);
    return el;
  }

  querySelector(selector) {
    if (!selector.startsWith("#")) return null;
    const id = selector.slice(1);
    return this._byId.get(id) ?? null;
  }

  createElement(tag) {
    return new StubElement(tag);
  }

  addEventListener(type, handler) {
    const list = this.eventListeners.get(type) ?? [];
    list.push(handler);
    this.eventListeners.set(type, list);
  }

  dispatchEvent(event) {
    const list = this.eventListeners.get(event.type) ?? [];
    const results = [];
    for (const h of list) results.push(h(event));
    return Promise.all(results);
  }
}

export function createAppDom() {
  const doc = new StubDocument();
  const ids = [
    "sessionSelect",
    "btnNewSession",
    "btnRenameSession",
    "btnDeleteSession",
    "dicePad",
    "draftDice",
    "draftMeta",
    "btnUndo",
    "btnClearDraft",
    "btnResetSession",
    "btnExportJson",
    "btnExportCsv",
    "fileImport",
    "statsSummary",
    "faceStats",
    "chiSquare",
    "sumStats",
    "sumMoments",
    "resultStats",
    "streakStats",
    "oddEvenStats",
    "pairStats",
    "doubleStats",
    "patternTop",
    "filterSelect",
    "btnCopySummary",
    "historyList",
  ];

  const elements = {};
  for (const id of ids) {
    let tag = "div";
    if (id.endsWith("Select")) tag = "select";
    if (id.startsWith("btn")) tag = "button";
    if (id === "fileImport") tag = "input";
    if (id === "patternTop" || id === "historyList") tag = "ol";
    const el = doc.register(new StubElement(tag, { id }));
    elements[id] = el;
  }

  return { doc, elements };
}
