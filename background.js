"use strict";

const KEY_MAP = "workspaceMap";
const KEY_PENDING = "pendingByTab";

function isWorkspaceHost(host) {
  host = host.toLowerCase();
  return host.endsWith(".slack.com") &&
    host !== "app.slack.com" &&
    host !== "www.slack.com";
}

function parseTarget(urlString) {
  let u;
  try { u = new URL(urlString); } catch { return null; }
  if (!isWorkspaceHost(u.hostname)) return null;

  let m = u.pathname.match(/^\/archives\/([A-Z0-9]+)\/?$/i);
  if (m) {
    return {
      host: u.hostname.toLowerCase(),
      channel: m[1],
      messageTs: null,
      search: u.search || ""
    };
  }

  m = u.pathname.match(/^\/archives\/([A-Z0-9]+)\/p(\d{10})(\d{6})\/?$/i);
  if (m) {
    const threadTs = u.searchParams.get("thread_ts");
    return {
      host: u.hostname.toLowerCase(),
      channel: m[1],
      messageTs: `${m[2]}.${m[3]}`,
      threadTs: /^\d{10}\.\d{6}$/.test(threadTs || "") ? threadTs : null,
      search: u.search || ""
    };
  }

  return null;
}

function parseTeamId(urlString) {
  let u;
  try { u = new URL(urlString); } catch { return null; }
  if (u.hostname !== "app.slack.com") return null;

  const m = u.pathname.match(/^\/client\/([TE][A-Z0-9]+)(?:\/|$)/i);
  return m ? m[1] : null;
}

function directUrl(teamId, target) {
  const base =
    `https://app.slack.com/client/${encodeURIComponent(teamId)}/` +
    `${encodeURIComponent(target.channel)}`;

  if (target.messageTs) {
    const rootTs = target.threadTs || target.messageTs;
    return `${base}/thread/${encodeURIComponent(target.channel)}-${rootTs}${target.search}`;
  }
  return `${base}${target.search}`;
}

async function getState() {
  const result = await chrome.storage.local.get([KEY_MAP, KEY_PENDING]);
  return {
    map: result[KEY_MAP] || {},
    pending: result[KEY_PENDING] || {}
  };
}

async function saveState(map, pending) {
  await chrome.storage.local.set({
    [KEY_MAP]: map,
    [KEY_PENDING]: pending
  });
}

// Main-frame navigation interception.
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const target = parseTarget(details.url);
  if (!target) return;

  const { map, pending } = await getState();

  // Known workspace: jump directly to Web Slack.
  const knownTeam = map[target.host];
  if (knownTeam) {
    const dest = directUrl(knownTeam, target);
    if (dest !== details.url) {
      await chrome.tabs.update(details.tabId, { url: dest });
    }
    return;
  }

  // First ever visit:
  // remember the requested destination, then open the workspace root.
  // Slack itself redirects the signed-in browser to app.slack.com/client/T.../C...
  pending[String(details.tabId)] = target;
  await saveState(map, pending);

  await chrome.tabs.update(details.tabId, {
    url: `https://${target.host}/`
  });
});

// Learn the Team/Org ID from Slack's own redirect, then immediately jump
// to the originally requested channel/message.
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const teamId = parseTeamId(details.url);
  if (!teamId) return;

  const { map, pending } = await getState();
  const key = String(details.tabId);
  const target = pending[key];
  if (!target) return;

  map[target.host] = teamId;
  delete pending[key];
  await saveState(map, pending);

  const dest = directUrl(teamId, target);
  if (dest !== details.url) {
    await chrome.tabs.update(details.tabId, { url: dest });
  }
});

// Prevent stale pending entries from surviving closed tabs.
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const { map, pending } = await getState();
  const key = String(tabId);
  if (pending[key]) {
    delete pending[key];
    await saveState(map, pending);
  }
});
