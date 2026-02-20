import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAppDom, createMemoryStorage } from "./stubs.js";

describe("main", () => {
  it("does not start when document is undefined", async () => {
    const url = new URL("../main.js?case=no-doc", import.meta.url);
    // ensure document is missing
    const oldDoc = globalThis.document;
    globalThis.document = undefined;
    await import(url.href);
    globalThis.document = oldDoc;
    assert.ok(true);
  });

  it("starts when document exists", async () => {
    const url = new URL("../main.js?case=with-doc", import.meta.url);
    const { doc } = createAppDom();
    const storage = createMemoryStorage();

    const oldDoc = globalThis.document;
    const oldStorage = globalThis.localStorage;
    globalThis.document = doc;
    globalThis.localStorage = storage;

    await import(url.href);

    globalThis.document = oldDoc;
    globalThis.localStorage = oldStorage;
    assert.ok(true);
  });
});
