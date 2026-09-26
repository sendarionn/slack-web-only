"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

function loadFunctions() {
  const listeners = [];
  const chrome = {
    storage: { local: { get() {}, set() {} } },
    tabs: {
      onRemoved: { addListener(listener) { listeners.push(listener); } },
      update() {}
    },
    webNavigation: {
      onBeforeNavigate: { addListener(listener) { listeners.push(listener); } }
    }
  };
  const context = { chrome, URL };
  vm.createContext(context);
  const source = fs.readFileSync("background.js", "utf8");
  vm.runInContext(
    `${source}\nglobalThis.testApi = { parseTarget, directUrl };`,
    context
  );
  return context.testApi;
}

test("スレッド返信の共有URLは親メッセージのスレッドを開く", () => {
  const { parseTarget, directUrl } = loadFunctions();
  const target = parseTarget(
    "https://example.slack.com/archives/C123/p1750000000123456" +
      "?thread_ts=1749999999.654321&cid=C123"
  );

  assert.equal(
    directUrl("T123", target),
    "https://app.slack.com/client/T123/C123/thread/C123-1749999999.654321" +
      "?thread_ts=1749999999.654321&cid=C123"
  );
});

test("通常メッセージの共有URLはそのメッセージをスレッドとして開く", () => {
  const { parseTarget, directUrl } = loadFunctions();
  const target = parseTarget(
    "https://example.slack.com/archives/C123/p1750000000123456"
  );

  assert.equal(
    directUrl("T123", target),
    "https://app.slack.com/client/T123/C123/thread/C123-1750000000.123456"
  );
});
