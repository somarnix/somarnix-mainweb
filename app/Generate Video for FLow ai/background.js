const FLOW_HOME_URL = "https://labs.google/fx/tools/flow";
const FLOW_PROJECT_BASE_URL = `${FLOW_HOME_URL}/project`;
const FLOW_LICENSE_STORAGE_KEY = "edugroit-flow-license-state";

function normalizeFlowUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function buildProjectUrl(projectId) {
  const normalizedId = String(projectId || "").trim();
  return normalizedId ? `${FLOW_PROJECT_BASE_URL}/${normalizedId}` : FLOW_PROJECT_BASE_URL;
}

async function ensureTargetTab(projectUrl, projectId) {
  const targetUrl = normalizeFlowUrl(projectUrl) || buildProjectUrl(projectId);
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => normalizeFlowUrl(tab.url || "") === targetUrl);

  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    return existing;
  }

  return chrome.tabs.create({ url: targetUrl });
}

async function ensureContentScriptReady(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
}

async function executeTask(payload = {}) {
  const tab = await ensureTargetTab(payload.projectUrl, payload.projectId);
  await ensureContentScriptReady(tab.id);

  const result = await chrome.tabs.sendMessage(tab.id, {
    type: "executeFlowTask",
    task: payload.task,
  });

  if (!result?.success) {
    throw new Error(result?.error || "Task execution failed.");
  }

  return {
    ok: true,
    tabId: tab.id,
    tabUrl: tab.url,
    result,
  };
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install") return;

  chrome.storage.local.set({
    projectUrl: FLOW_HOME_URL,
    projectId: "",
  });

  chrome.tabs.create({ url: FLOW_HOME_URL });

  chrome.contextMenus.create({
    id: "autoGenerate",
    title: "Open Edugroit Flow Tool",
    contexts: ["page"],
    documentUrlPatterns: ["https://labs.google/fx/tools/flow/*"],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "autoGenerate") return;
  chrome.action.openPopup();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === "website:ping") {
    sendResponse({ ok: true, installed: true });
    return false;
  }

  if (message?.action === "website:openFlow") {
    ensureTargetTab(message.payload?.projectUrl, message.payload?.projectId)
      .then((tab) => sendResponse({ ok: true, tabId: tab.id, tabUrl: tab.url }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    return true;
  }

  if (message?.action === "website:runTask") {
    executeTask(message.payload || {})
      .then((response) => sendResponse(response))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    return true;
  }

  if (message?.action === "website:storeLicenseState") {
    chrome.storage.local
      .set({
        [FLOW_LICENSE_STORAGE_KEY]: message.payload?.licenseState || null,
      })
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    return true;
  }

  if (message?.action === "website:clearLicenseState") {
    chrome.storage.local
      .remove(FLOW_LICENSE_STORAGE_KEY)
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      );
    return true;
  }

  return false;
});
