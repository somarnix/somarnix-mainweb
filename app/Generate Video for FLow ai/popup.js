const FLOW_HOME_URL = "https://labs.google/fx/tools/flow";
const FLOW_PROJECT_BASE_URL = `${FLOW_HOME_URL}/project/`;
const FLOW_LICENSE_STORAGE_KEY = "edugroit-flow-license-state";
const FLOW_POPUP_CONFIG_KEY = "edugroit-flow-popup-config";
const DEFAULT_WEBSITE_ORIGIN = "http://localhost:3000";
const KNOWN_WEBSITE_PATTERNS = [
  /^https?:\/\/localhost:3000$/i,
  /^https?:\/\/127\.0\.0\.1:3000$/i,
  /^https:\/\/([a-z0-9-]+\.)*edugroit\.com$/i,
];

const VIDEO_MODELS = [
  "Veo 3.1 - Fast",
  "Veo 3.1 - Fast [Lower Priority]",
  "Veo 3.1 - Quality",
];
const IMAGE_MODELS = [
  "Nano Banana Pro",
  "Nano Banana 2",
  "Imagen 4",
];

const defaultConfig = {
  projectId: "",
  projectUrl: FLOW_PROJECT_BASE_URL,
  promptInput: "",
  mediaType: "video",
  model: VIDEO_MODELS[0],
  videoMode: "Ingredients",
  orientation: "Portrait",
  variantCount: "1",
};

const elements = {
  licenseStatus: document.getElementById("licenseStatus"),
  toolSlug: document.getElementById("toolSlug"),
  deviceId: document.getElementById("deviceId"),
  expiresAt: document.getElementById("expiresAt"),
  projectId: document.getElementById("projectId"),
  projectUrl: document.getElementById("projectUrl"),
  promptInput: document.getElementById("promptInput"),
  mediaType: document.getElementById("mediaType"),
  model: document.getElementById("model"),
  videoMode: document.getElementById("videoMode"),
  orientation: document.getElementById("orientation"),
  variantCount: document.getElementById("variantCount"),
  openWebsiteBtn: document.getElementById("openWebsiteBtn"),
  openFlowBtn: document.getElementById("openFlowBtn"),
  runBtn: document.getElementById("runBtn"),
  stopBtn: document.getElementById("stopBtn"),
  status: document.getElementById("status"),
};

let popupConfig = { ...defaultConfig };
let syncedLicenseState = null;
let isRunning = false;
let stopRequested = false;

function normalizeFlowUrl(url) {
  return String(url || "").trim().replace(/\/+$/, "");
}

function extractProjectId(input) {
  const value = String(input || "").trim();
  if (!value) return "";
  const fromUrl = value.match(/\/flow\/project\/([^/?#]+)/i);
  if (fromUrl && fromUrl[1]) return fromUrl[1].trim();
  if (/^[a-z0-9-]+$/i.test(value)) return value;
  return "";
}

function buildProjectUrl(projectId) {
  const normalizedId = String(projectId || "").trim();
  return normalizedId ? `${FLOW_PROJECT_BASE_URL}${normalizedId}` : FLOW_PROJECT_BASE_URL;
}

function readLines(input) {
  return String(input || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function isKnownWebsiteOrigin(origin) {
  const normalized = String(origin || "").trim().replace(/\/+$/, "");
  return KNOWN_WEBSITE_PATTERNS.some((pattern) => pattern.test(normalized));
}

async function detectWebsiteOriginFromTabs() {
  const tabs = await chrome.tabs.query({});
  const matchedTab = tabs.find((tab) => {
    try {
      const origin = new URL(String(tab.url || "")).origin;
      return isKnownWebsiteOrigin(origin);
    } catch {
      return false;
    }
  });

  if (!matchedTab || !matchedTab.url) return "";
  try {
    return new URL(matchedTab.url).origin;
  } catch {
    return "";
  }
}

async function getWebsiteOrigin() {
  const licenseOrigin = String(syncedLicenseState && syncedLicenseState.websiteOrigin ? syncedLicenseState.websiteOrigin : "")
    .trim()
    .replace(/\/+$/, "");
  if (isKnownWebsiteOrigin(licenseOrigin)) {
    return licenseOrigin;
  }

  const detectedOrigin = await detectWebsiteOriginFromTabs();
  if (detectedOrigin) {
    return detectedOrigin;
  }

  return DEFAULT_WEBSITE_ORIGIN;
}

async function getWebsiteFlowUrl() {
  const origin = await getWebsiteOrigin();
  return `${origin}/tools-ai/promt-ai`;
}

function showStatus(message, type = "info") {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
}

function showLicenseStatus(message, type = "info") {
  elements.licenseStatus.textContent = message;
  elements.licenseStatus.className = `status ${type}`;
}

async function openOrFocus(url) {
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find((tab) => String(tab.url || "").startsWith(url));
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    if (typeof existing.windowId === "number") {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    return existing;
  }
  return chrome.tabs.create({ url });
}

function populateModelOptions(mediaType, preferredModel) {
  const models = mediaType === "image" ? IMAGE_MODELS : VIDEO_MODELS;
  elements.model.innerHTML = "";
  for (const model of models) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    elements.model.appendChild(option);
  }

  const nextModel = models.includes(preferredModel) ? preferredModel : models[0];
  elements.model.value = nextModel;
  popupConfig.model = nextModel;
}

function renderConfig() {
  elements.projectId.value = popupConfig.projectId;
  elements.projectUrl.value = popupConfig.projectUrl;
  elements.promptInput.value = popupConfig.promptInput;
  elements.mediaType.value = popupConfig.mediaType;
  populateModelOptions(popupConfig.mediaType, popupConfig.model);
  elements.videoMode.value = popupConfig.videoMode;
  elements.orientation.value = popupConfig.orientation;
  elements.variantCount.value = popupConfig.variantCount;
}

function renderLicenseState() {
  const license = syncedLicenseState || {};
  elements.toolSlug.value = license.toolSlug || "";
  elements.deviceId.value = license.deviceId || "";
  elements.expiresAt.value = formatDate(license.expiresAt || "");

  if (license.token && license.toolSlug && license.deviceId) {
    showLicenseStatus(
      `Website license ready for ${license.toolSlug}. Next check ${formatDate(
        license.nextCheckAt || ""
      )}.`,
      "success"
    );
  } else {
    showLicenseStatus(
      "No synced website license yet. Open the website Flow page and activate the license first.",
      "warning"
    );
  }

  updateButtons();
}

function updateButtons() {
  const hasLicense =
    Boolean(syncedLicenseState && syncedLicenseState.token) &&
    Boolean(syncedLicenseState && syncedLicenseState.toolSlug) &&
    Boolean(syncedLicenseState && syncedLicenseState.deviceId);

  elements.runBtn.disabled = isRunning || !hasLicense;
  elements.stopBtn.disabled = !isRunning;
  elements.openWebsiteBtn.disabled = isRunning;
}

async function loadState() {
  const stored = await chrome.storage.local.get([
    FLOW_LICENSE_STORAGE_KEY,
    FLOW_POPUP_CONFIG_KEY,
  ]);

  const storedConfig =
    stored && stored[FLOW_POPUP_CONFIG_KEY] && typeof stored[FLOW_POPUP_CONFIG_KEY] === "object"
      ? stored[FLOW_POPUP_CONFIG_KEY]
      : {};
  popupConfig = {
    ...defaultConfig,
    ...storedConfig,
  };
  popupConfig.projectId = extractProjectId(popupConfig.projectId || popupConfig.projectUrl);
  popupConfig.projectUrl = buildProjectUrl(popupConfig.projectId);
  popupConfig.mediaType = popupConfig.mediaType === "image" ? "image" : "video";
  popupConfig.variantCount = String(popupConfig.variantCount || "1");

  syncedLicenseState =
    stored && stored[FLOW_LICENSE_STORAGE_KEY] && typeof stored[FLOW_LICENSE_STORAGE_KEY] === "object"
      ? stored[FLOW_LICENSE_STORAGE_KEY]
      : null;

  renderConfig();
  renderLicenseState();
}

async function saveConfig() {
  await chrome.storage.local.set({
    [FLOW_POPUP_CONFIG_KEY]: popupConfig,
  });
}

function buildGenerationOptions() {
  return {
    mediaType: popupConfig.mediaType,
    model: popupConfig.model,
    videoMode: popupConfig.videoMode,
    orientation: popupConfig.orientation,
    variantCount: Number(popupConfig.variantCount || "1"),
  };
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response || {});
    });
  });
}

async function ensureLicenseFresh() {
  if (!syncedLicenseState || !syncedLicenseState.token) {
    throw new Error("Activate the license from the website first.");
  }

  const nextCheckAt = new Date(syncedLicenseState.nextCheckAt || "");
  if (!syncedLicenseState.nextCheckAt || Number.isNaN(nextCheckAt.getTime())) {
    return syncedLicenseState;
  }

  if (nextCheckAt.getTime() > Date.now()) {
    return syncedLicenseState;
  }

  const websiteOrigin = await getWebsiteOrigin();
  const response = await fetch(`${websiteOrigin}/api/tools/license/heartbeat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${syncedLicenseState.token}`,
    },
    body: JSON.stringify({
      slug: syncedLicenseState.toolSlug,
      deviceId: syncedLicenseState.deviceId,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok || !data.token) {
    throw new Error(data.error || data.reason || "License heartbeat failed.");
  }

  syncedLicenseState = {
    ...syncedLicenseState,
    token: String(data.token || ""),
    expiresAt: String(data.expiresAt || ""),
    nextCheckAt: String(data.nextCheckAt || ""),
    websiteOrigin,
  };
  await chrome.storage.local.set({
    [FLOW_LICENSE_STORAGE_KEY]: syncedLicenseState,
  });
  renderLicenseState();
  return syncedLicenseState;
}

async function fetchFlowTask(prompt, currentStep) {
  const websiteOrigin = await getWebsiteOrigin();
  const response = await fetch(`${websiteOrigin}/api/flow-task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${syncedLicenseState.token}`,
      "x-tool-slug": syncedLicenseState.toolSlug,
      "x-device-id": syncedLicenseState.deviceId,
    },
    body: JSON.stringify({
      prompt,
      currentStep,
      deviceId: syncedLicenseState.deviceId,
      toolSlug: syncedLicenseState.toolSlug,
      generationOptions: buildGenerationOptions(),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to fetch Flow task.");
  }
  return data;
}

async function runAutomation() {
  const prompts = readLines(popupConfig.promptInput);
  if (!prompts.length) {
    showStatus("Add at least one prompt before running.", "warning");
    return;
  }

  if (!popupConfig.projectId) {
    showStatus("Project ID is required.", "warning");
    return;
  }

  isRunning = true;
  stopRequested = false;
  updateButtons();
  showStatus("Checking synced website license...", "info");

  try {
    await ensureLicenseFresh();

    for (let promptIndex = 0; promptIndex < prompts.length; promptIndex += 1) {
      if (stopRequested) {
        throw new Error("Stopped by user.");
      }

      let currentStep = 0;
      showStatus(`Running prompt ${promptIndex + 1} of ${prompts.length}...`, "info");

      while (!stopRequested) {
        const task = await fetchFlowTask(prompts[promptIndex], currentStep);
        if (task.action === "complete") {
          break;
        }

        const result = await sendRuntimeMessage({
          action: "website:runTask",
          payload: {
            projectId: popupConfig.projectId,
            projectUrl: popupConfig.projectUrl,
            task,
          },
        });

        if (!result || result.ok === false) {
          throw new Error(result && result.error ? result.error : "Flow task execution failed.");
        }

        currentStep = Number(task.nextStep || currentStep + 1);
      }
    }

    if (stopRequested) {
      throw new Error("Stopped by user.");
    }

    showStatus("Extension automation completed.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showStatus(message, message === "Stopped by user." ? "warning" : "error");
  } finally {
    isRunning = false;
    stopRequested = false;
    updateButtons();
  }
}

function bindFieldEvents() {
  elements.projectId.addEventListener("input", async (event) => {
    popupConfig.projectId = extractProjectId(event.target.value);
    popupConfig.projectUrl = buildProjectUrl(popupConfig.projectId);
    renderConfig();
    await saveConfig();
  });

  elements.projectUrl.addEventListener("change", async (event) => {
    const rawValue = String(event.target.value || "").trim();
    popupConfig.projectId = extractProjectId(rawValue);
    popupConfig.projectUrl = popupConfig.projectId
      ? buildProjectUrl(popupConfig.projectId)
      : rawValue || FLOW_PROJECT_BASE_URL;
    renderConfig();
    await saveConfig();
  });

  elements.promptInput.addEventListener("input", async (event) => {
    popupConfig.promptInput = String(event.target.value || "");
    await saveConfig();
  });

  elements.mediaType.addEventListener("change", async (event) => {
    popupConfig.mediaType = event.target.value === "image" ? "image" : "video";
    populateModelOptions(popupConfig.mediaType, popupConfig.model);
    await saveConfig();
  });

  elements.model.addEventListener("change", async (event) => {
    popupConfig.model = String(event.target.value || "");
    await saveConfig();
  });

  elements.videoMode.addEventListener("change", async (event) => {
    popupConfig.videoMode = String(event.target.value || "Ingredients");
    await saveConfig();
  });

  elements.orientation.addEventListener("change", async (event) => {
    popupConfig.orientation = String(event.target.value || "Portrait");
    await saveConfig();
  });

  elements.variantCount.addEventListener("change", async (event) => {
    popupConfig.variantCount = String(event.target.value || "1");
    await saveConfig();
  });

  elements.openWebsiteBtn.addEventListener("click", async () => {
    await openOrFocus(await getWebsiteFlowUrl());
    showStatus("Website Flow page opened.", "success");
  });

  elements.openFlowBtn.addEventListener("click", async () => {
    const targetUrl = normalizeFlowUrl(popupConfig.projectUrl) || FLOW_HOME_URL;
    await openOrFocus(targetUrl);
    showStatus("Google Flow opened.", "success");
  });

  elements.runBtn.addEventListener("click", () => {
    void runAutomation();
  });

  elements.stopBtn.addEventListener("click", () => {
    stopRequested = true;
    showStatus("Stopping after the current step...", "warning");
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (!Object.prototype.hasOwnProperty.call(changes, FLOW_LICENSE_STORAGE_KEY)) return;
    syncedLicenseState = changes[FLOW_LICENSE_STORAGE_KEY].newValue || null;
    renderLicenseState();
  });
}

async function initialize() {
  await loadState();
  bindFieldEvents();

  try {
    const response = await sendRuntimeMessage({ action: "website:ping" });
    if (response && response.installed) {
      showStatus("Extension ready. Activate on website once, then run from here.", "success");
      return;
    }
  } catch {
    // The popup itself is already running, so there is nothing extra to do here.
  }

  showStatus("Popup ready.", "info");
}

void initialize();
