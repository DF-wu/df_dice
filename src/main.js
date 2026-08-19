import { createDiceApp } from "./app.js";

createDiceApp({
  document: window.document,
  storage: window.localStorage,
  clipboard: window.navigator.clipboard ?? null,
});
