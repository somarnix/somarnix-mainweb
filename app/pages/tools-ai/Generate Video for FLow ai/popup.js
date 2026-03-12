const projectIdInput = document.getElementById("projectId");
const projectUrlInput = document.getElementById("projectUrl");
const promptInput = document.getElementById("prompt");
const testLinkBtn = document.getElementById("testLink");
const testPageBtn = document.getElementById("testPage");
const runBtn = document.getElementById("runBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const statusDiv = document.getElementById("status");
const autoRetryCheckbox = document.getElementById("autoRetry");
const notifyCompleteCheckbox = document.getElementById("notifyComplete");
const singleModeRadio = document.getElementById("singleMode");
const multipleModeRadio = document.getElementById("multipleMode");
const promptCountBadge = document.getElementById("promptCount");
const promptHint = document.getElementById("promptHint");
const queueSettings = document.getElementById("queueSettings");
const delayBetweenInput = document.getElementById("delayBetween");
const videoModeSection = document.getElementById("videoModeSection");
const modelSelect = document.getElementById("modelSelect");
const modelHint = document.getElementById("modelHint");
const mediaTypeRadios = document.querySelectorAll('input[name="mediaType"]');
const videoModeRadios = document.querySelectorAll('input[name="videoMode"]');
const orientationRadios = document.querySelectorAll(
  'input[name="orientation"]',
);
const variantCountRadios = document.querySelectorAll(
  'input[name="variantCount"]',
);

const FLOW_HOME_URL = "https://labs.google/fx/tools/flow";
const FLOW_PROJECT_BASE_URL = `${FLOW_HOME_URL}/project`;

const modelChoices = {
  video: [
    "Veo 3.1 - Fast",
    "Veo 3.1 - Fast [Lower Priority]",
    "Veo 3.1 - Quality",
  ],
  image: ["🍌 Nano Banana Pro", "Nano Banana 2", "Imagen 4"],
};

const defaultSettings = {
  projectUrl: "",
  projectId: "",
  prompt: "",
  autoRetry: true,
  notifyComplete: true,
  promptMode: "single",
  delayBetween: 10,
  mediaType: "video",
  videoMode: "ingredients",
  orientation: "landscape",
  variantCount: "1",
  model: "Veo 3.1 - Fast",
};

let currentMode = defaultSettings.promptMode;
let activeRun = null;

function lockRun(mode, total = 1, meta = {}) {
  activeRun = { mode, total, ...meta };
  runBtn.disabled = true;
  runBtn.classList.add("loading");
  runBtn.textContent =
    mode === "multiple" ? `Running (0/${total})...` : "Running...";
  stopBtn.disabled = false;
}

function unlockRun() {
  activeRun = null;
  runBtn.disabled = false;
  runBtn.classList.remove("loading");
  runBtn.textContent = "Run";
  stopBtn.disabled = true;
}

async function sendControlActionToProjectTabs(action, preferredTabId = null) {
  const tabs = await getAllProjectTabs();
  if (!tabs.length) {
    return { successCount: 0, total: 0 };
  }

  const orderedTabs = [...tabs].sort((a, b) => {
    if (a.id === preferredTabId) {
      return -1;
    }
    if (b.id === preferredTabId) {
      return 1;
    }
    return 0;
  });

  let successCount = 0;
  for (const tab of orderedTabs) {
    try {
      await ensureContentScriptReady(tab.id);
      const response = await runGenerationInTab(tab.id, { action });
      if (response?.success) {
        successCount += 1;
      }
    } catch (error) {
      console.warn(
        `Control action "${action}" failed for tab ${tab.id}:`,
        error,
      );
    }
  }

  return { successCount, total: orderedTabs.length };
}

function resetPopupFieldsToDefaults() {
  projectIdInput.value = "";
  projectUrlInput.value = "";
  promptInput.value = "";
  autoRetryCheckbox.checked = defaultSettings.autoRetry;
  notifyCompleteCheckbox.checked = defaultSettings.notifyComplete;
  delayBetweenInput.value = String(defaultSettings.delayBetween);

  currentMode = defaultSettings.promptMode;
  singleModeRadio.checked = true;
  multipleModeRadio.checked = false;
  queueSettings.style.display = "none";

  setCheckedValue(mediaTypeRadios, defaultSettings.mediaType);
  setCheckedValue(videoModeRadios, defaultSettings.videoMode);
  setCheckedValue(orientationRadios, defaultSettings.orientation);
  setCheckedValue(variantCountRadios, defaultSettings.variantCount);

  renderModelOptions(defaultSettings.model);
  updateMediaUI();
  updatePromptUI();
}

chrome.storage.local.get(Object.keys(defaultSettings), (result) => {
  const settings = { ...defaultSettings, ...result };

  const initialProjectId = normalizeProjectId(
    settings.projectId || extractProjectId(settings.projectUrl),
  );
  projectIdInput.value = initialProjectId;
  projectUrlInput.value = initialProjectId
    ? buildProjectUrl(initialProjectId)
    : isFlowProjectUrl(settings.projectUrl)
      ? normalizeFlowUrl(settings.projectUrl)
      : "";
  promptInput.value = settings.prompt;
  autoRetryCheckbox.checked = settings.autoRetry;
  notifyCompleteCheckbox.checked = settings.notifyComplete;
  delayBetweenInput.value = settings.delayBetween;
  currentMode = settings.promptMode;

  singleModeRadio.checked = currentMode === "single";
  multipleModeRadio.checked = currentMode === "multiple";
  queueSettings.style.display = currentMode === "multiple" ? "block" : "none";

  setCheckedValue(mediaTypeRadios, settings.mediaType);
  setCheckedValue(videoModeRadios, settings.videoMode);
  setCheckedValue(orientationRadios, settings.orientation);
  setCheckedValue(variantCountRadios, String(settings.variantCount));

  renderModelOptions(settings.model);
  updateMediaUI();
  updatePromptUI();
  initializeProjectUrl();
});

function setCheckedValue(radios, value) {
  radios.forEach((radio) => {
    radio.checked = radio.value === value;
  });
}

function getCheckedValue(radios) {
  const checked = Array.from(radios).find((radio) => radio.checked);
  return checked?.value;
}

function updateMediaUI() {
  const mediaType =
    getCheckedValue(mediaTypeRadios) || defaultSettings.mediaType;

  videoModeSection.style.display = mediaType === "video" ? "block" : "none";
  modelHint.textContent =
    mediaType === "video"
      ? "Select one of the Veo 3.1 models shown in Flow."
      : "Select the image model shown under the x1-x4 buttons.";
  renderModelOptions(modelSelect.value);
}

function renderModelOptions(preferredModel) {
  const mediaType =
    getCheckedValue(mediaTypeRadios) || defaultSettings.mediaType;
  const models = modelChoices[mediaType] || [];

  modelSelect.replaceChildren();
  models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    modelSelect.append(option);
  });

  const selectedModel = models.includes(preferredModel)
    ? preferredModel
    : models[0];
  if (selectedModel) {
    modelSelect.value = selectedModel;
    persistChoice("model", selectedModel);
  }
}

function persistChoice(key, value) {
  chrome.storage.local.set({ [key]: value });
}

function normalizeFlowUrl(url) {
  return (url || "").trim().replace(/\/+$/, "");
}

function normalizeProjectId(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "";
  }

  const extracted = extractProjectId(trimmed);
  if (extracted) {
    return extracted;
  }

  return trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
}

function buildProjectUrl(projectId) {
  const normalizedProjectId = normalizeProjectId(projectId);
  if (!normalizedProjectId) {
    return "";
  }

  return `${FLOW_PROJECT_BASE_URL}/${normalizedProjectId}`;
}

function isFlowUrl(url) {
  return normalizeFlowUrl(url).startsWith(FLOW_HOME_URL);
}

function isFlowHomeUrl(url) {
  return normalizeFlowUrl(url) === FLOW_HOME_URL;
}

function isFlowProjectUrl(url) {
  return Boolean(extractProjectId(url));
}

function extractProjectId(url) {
  const match = normalizeFlowUrl(url).match(/\/project\/([^/?#]+)/);
  return match ? match[1] : "";
}

function setProjectFieldsFromUrl(url, { persist = true } = {}) {
  const normalizedUrl = normalizeFlowUrl(url);
  const projectId = extractProjectId(normalizedUrl);

  projectUrlInput.value = normalizedUrl;
  projectIdInput.value = projectId;

  if (!persist) {
    return;
  }

  persistChoice("projectUrl", normalizedUrl);
  persistChoice("projectId", projectId);
}

function syncUrlFromProjectId(projectId, { persist = true } = {}) {
  const normalizedProjectId = normalizeProjectId(projectId);
  projectIdInput.value = normalizedProjectId;

  if (!normalizedProjectId) {
    projectUrlInput.value = "";
    if (persist) {
      persistChoice("projectId", "");
      persistChoice("projectUrl", "");
    }
    return "";
  }

  const generatedUrl = buildProjectUrl(normalizedProjectId);
  projectUrlInput.value = generatedUrl;

  if (!persist) {
    return generatedUrl;
  }

  persistChoice("projectId", normalizedProjectId);
  persistChoice("projectUrl", generatedUrl);
  return generatedUrl;
}

async function getActiveFlowTab() {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return activeTab && isFlowUrl(activeTab.url || "") ? activeTab : null;
}

async function getCurrentWindowProjectTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs.filter((tab) => isFlowProjectUrl(tab.url || ""));
}

async function getAllProjectTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab) => isFlowProjectUrl(tab.url || ""));
}

async function initializeProjectUrl() {
  const typedProjectId = normalizeProjectId(projectIdInput.value);
  if (typedProjectId) {
    syncUrlFromProjectId(typedProjectId, { persist: true });
    return;
  }

  const typedUrl = projectUrlInput.value.trim();
  if (isFlowProjectUrl(typedUrl)) {
    setProjectFieldsFromUrl(typedUrl, { persist: true });
    return;
  }

  const activeFlowTab = await getActiveFlowTab();
  if (activeFlowTab?.url && isFlowProjectUrl(activeFlowTab.url)) {
    setProjectFieldsFromUrl(activeFlowTab.url, { persist: true });
    return;
  }

  const projectTabs = await getCurrentWindowProjectTabs();
  if (projectTabs.length > 0) {
    setProjectFieldsFromUrl(projectTabs[0].url, { persist: true });
    return;
  }

  const allProjectTabs = await getAllProjectTabs();
  if (allProjectTabs.length > 0) {
    setProjectFieldsFromUrl(allProjectTabs[0].url, { persist: true });
  }
}

async function resolveTargetUrl() {
  const typedProjectId = normalizeProjectId(projectIdInput.value);
  if (typedProjectId) {
    const currentUrlProjectId = extractProjectId(projectUrlInput.value);
    if (currentUrlProjectId !== typedProjectId) {
      return syncUrlFromProjectId(typedProjectId, { persist: true });
    }
  }

  const inputUrl = projectUrlInput.value.trim();
  if (isFlowProjectUrl(inputUrl)) {
    setProjectFieldsFromUrl(inputUrl, { persist: true });
    return normalizeFlowUrl(inputUrl);
  }

  if (typedProjectId) {
    return syncUrlFromProjectId(typedProjectId, { persist: true });
  }

  const activeFlowTab = await getActiveFlowTab();
  if (activeFlowTab?.url && isFlowProjectUrl(activeFlowTab.url)) {
    setProjectFieldsFromUrl(activeFlowTab.url, { persist: true });
    return normalizeFlowUrl(activeFlowTab.url);
  }

  const projectTabs = await getCurrentWindowProjectTabs();
  if (projectTabs.length > 0) {
    setProjectFieldsFromUrl(projectTabs[0].url, { persist: true });
    return normalizeFlowUrl(projectTabs[0].url);
  }

  const allProjectTabs = await getAllProjectTabs();
  if (allProjectTabs.length > 0) {
    setProjectFieldsFromUrl(allProjectTabs[0].url, { persist: true });
    return normalizeFlowUrl(allProjectTabs[0].url);
  }

  return "";
}

projectIdInput.addEventListener("input", () => {
  syncUrlFromProjectId(projectIdInput.value, { persist: false });
});

projectIdInput.addEventListener("change", () => {
  syncUrlFromProjectId(projectIdInput.value, { persist: true });
});

projectUrlInput.addEventListener("input", () => {
  const projectIdFromUrl = extractProjectId(projectUrlInput.value);
  if (projectIdFromUrl) {
    projectIdInput.value = projectIdFromUrl;
  }
});

projectUrlInput.addEventListener("change", () => {
  const typedUrl = projectUrlInput.value.trim();
  if (isFlowProjectUrl(typedUrl)) {
    setProjectFieldsFromUrl(typedUrl, { persist: true });
    return;
  }

  projectUrlInput.value = typedUrl;
  persistChoice("projectUrl", typedUrl);
  persistChoice("projectId", "");
  projectIdInput.value = "";
});

promptInput.addEventListener("change", () => {
  persistChoice("prompt", promptInput.value);
});

promptInput.addEventListener("input", () => {
  updatePromptUI();
});

delayBetweenInput.addEventListener("change", () => {
  const delayBetween =
    Number.parseInt(delayBetweenInput.value, 10) ||
    defaultSettings.delayBetween;
  delayBetweenInput.value = String(delayBetween);
  persistChoice("delayBetween", delayBetween);
});

singleModeRadio.addEventListener("change", () => {
  currentMode = "single";
  queueSettings.style.display = "none";
  persistChoice("promptMode", currentMode);
  updatePromptUI();
});

multipleModeRadio.addEventListener("change", () => {
  currentMode = "multiple";
  queueSettings.style.display = "block";
  persistChoice("promptMode", currentMode);
  updatePromptUI();
});

mediaTypeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    persistChoice("mediaType", radio.value);
    updateMediaUI();
  });
});

modelSelect.addEventListener("change", () => {
  persistChoice("model", modelSelect.value);
});

videoModeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    persistChoice("videoMode", radio.value);
  });
});

orientationRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    persistChoice("orientation", radio.value);
  });
});

variantCountRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    persistChoice("variantCount", radio.value);
  });
});

autoRetryCheckbox.addEventListener("change", () => {
  persistChoice("autoRetry", autoRetryCheckbox.checked);
});

notifyCompleteCheckbox.addEventListener("change", () => {
  persistChoice("notifyComplete", notifyCompleteCheckbox.checked);
});

function getPromptsFromText() {
  const raw = String(promptInput.value || "").trim();
  if (!raw) {
    return [];
  }

  // Multiple mode supports either one-prompt-per-line or comma-separated prompts.
  if (raw.includes("\n")) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [raw];
}

function getGenerationOptions() {
  return {
    mediaType: getCheckedValue(mediaTypeRadios) || defaultSettings.mediaType,
    videoMode: getCheckedValue(videoModeRadios) || defaultSettings.videoMode,
    orientation:
      getCheckedValue(orientationRadios) || defaultSettings.orientation,
    variantCount:
      getCheckedValue(variantCountRadios) || defaultSettings.variantCount,
    model: modelSelect.value || defaultSettings.model,
  };
}

function updatePromptUI() {
  if (currentMode === "multiple") {
    const count = getPromptsFromText().length;
    promptCountBadge.textContent = count > 0 ? `${count} prompts` : "";
    promptHint.textContent = `Multiple prompts mode: ${count} prompt${count === 1 ? "" : "s"} queued (line or comma)`;
    promptInput.rows = 8;
    return;
  }

  promptCountBadge.textContent = "";
  promptHint.textContent = "Single prompt mode";
  promptInput.rows = 4;
}

function showStatus(message, type = "info") {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;

  window.clearTimeout(showStatus.timeoutId);
  if (type === "error") {
    return;
  }

  showStatus.timeoutId = window.setTimeout(() => {
    statusDiv.textContent = "";
    statusDiv.className = "status";
  }, 5000);
}

async function ensureTargetTab(url) {
  const normalizedTargetUrl = normalizeFlowUrl(url);
  const targetProjectId = extractProjectId(url);
  const [currentTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (normalizeFlowUrl(currentTab?.url || "") === normalizedTargetUrl) {
    return currentTab;
  }

  if (
    targetProjectId &&
    extractProjectId(currentTab?.url || "") === targetProjectId
  ) {
    return currentTab;
  }

  const matchingTabs = await chrome.tabs.query({ currentWindow: true });
  const existingTargetTab = matchingTabs.find(
    (tab) =>
      normalizeFlowUrl(tab.url || "") === normalizedTargetUrl ||
      (targetProjectId && extractProjectId(tab.url || "") === targetProjectId),
  );

  if (existingTargetTab) {
    return existingTargetTab;
  }

  const targetTab = await chrome.tabs.create({ url });
  await new Promise((resolve) => {
    const listener = (tabId, changeInfo) => {
      if (tabId === targetTab.id && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
  return targetTab;
}

async function executeInTab(tabId, func, args = []) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });

  return result?.result;
}

async function getContentScriptVersion(tabId) {
  try {
    return await executeInTab(
      tabId,
      () => globalThis.__flowAutoGeneratorApi?.version || null,
    );
  } catch (error) {
    return null;
  }
}

async function isFlowTabHealthy(tabId) {
  try {
    return await executeInTab(tabId, () => {
      const title = String(document.title || "").toLowerCase();
      const bodyText = String(document.body?.innerText || "").toLowerCase();
      const hasClientError =
        title.includes("application error") ||
        bodyText.includes("application error: a client-side");
      return !hasClientError;
    });
  } catch (error) {
    return false;
  }
}

async function ensureContentScriptReady(tabId) {
  let version = await getContentScriptVersion(tabId);
  console.log("[ensureContentScriptReady] Initial version check:", version);

  if (!version) {
    console.log(
      "[ensureContentScriptReady] Content script not found, injecting...",
    );
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
      console.log(
        "[ensureContentScriptReady] Script injected, waiting for initialization...",
      );
    } catch (error) {
      console.error(
        "[ensureContentScriptReady] Failed to inject script:",
        error,
      );
      throw new Error(`Failed to inject content script: ${error.message}`);
    }

    // Wait for content script to initialize and be ready
    let attemptCount = 0;
    const maxAttempts = 8;
    const delayMs = 500;

    while (attemptCount < maxAttempts) {
      attemptCount++;
      console.log(
        `[ensureContentScriptReady] Waiting for API readiness (attempt ${attemptCount}/${maxAttempts})...`,
      );

      // Wait before checking
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      version = await getContentScriptVersion(tabId);
      console.log(
        `[ensureContentScriptReady] Readiness check ${attemptCount}: version =`,
        version,
      );

      if (version) {
        console.log(
          "[ensureContentScriptReady] ✓ Content script ready with version:",
          version,
        );
        return;
      }
    }

    // If still not ready after retries
    const lastCheck = await getContentScriptVersion(tabId);
    console.error(
      "[ensureContentScriptReady] FAILED - Content script still not ready after retries",
      {
        attempts: maxAttempts,
        lastVersion: lastCheck,
      },
    );
    throw new Error(
      "Content script API is not ready on the Flow tab. Please refresh the page and try again.",
    );
  }

  console.log(
    "[ensureContentScriptReady] ✓ Content script already ready, version:",
    version,
  );
}

async function runGenerationInTab(tabId, payload) {
  return executeInTab(
    tabId,
    async (request) => {
      if (!globalThis.__flowAutoGeneratorApi?.runGenerationRequest) {
        throw new Error("Flow generator API is unavailable on this tab.");
      }

      return globalThis.__flowAutoGeneratorApi.runGenerationRequest(request);
    },
    [payload],
  );
}

testLinkBtn.addEventListener("click", async () => {
  const url = await resolveTargetUrl();
  if (!url) {
    showStatus("Enter a Flow project ID or project URL first.", "warning");
    return;
  }

  if (!isFlowProjectUrl(url)) {
    showStatus(
      "Use URL format: https://labs.google/fx/tools/flow/project/<project-id>",
      "warning",
    );
    return;
  }

  try {
    const response = await fetch(url, { method: "HEAD" });
    if (response.ok) {
      showStatus("Link is reachable.", "success");
      return;
    }
    showStatus(`Link responded with status ${response.status}.`, "warning");
  } catch (error) {
    showStatus(`Cannot access link: ${error.message}`, "error");
  }
});

testPageBtn.addEventListener("click", () => {
  resolveTargetUrl().then((url) => {
    if (!url) {
      showStatus("Enter a Flow project ID or project URL first.", "warning");
      return;
    }

    if (!isFlowProjectUrl(url)) {
      showStatus(
        "Use URL format: https://labs.google/fx/tools/flow/project/<project-id>",
        "warning",
      );
      return;
    }

    chrome.tabs.create({ url }, () => {
      showStatus("Opening page in a new tab...", "info");
    });
  });
});

runBtn.addEventListener("click", async () => {
  if (activeRun) {
    showStatus(
      "Already running. Please wait for current process to finish.",
      "warning",
    );
    return;
  }

  const url = await resolveTargetUrl();
  const promptText = promptInput.value.trim();
  const generationOptions = getGenerationOptions();

  if (!url) {
    showStatus(
      "Enter a Google Flow project ID or full project URL.",
      "warning",
    );
    return;
  }

  if (!isFlowProjectUrl(url)) {
    showStatus(
      "Use URL format: https://labs.google/fx/tools/flow/project/<project-id>",
      "warning",
    );
    return;
  }

  if (!promptText) {
    showStatus("Enter at least one prompt.", "warning");
    return;
  }

  const prompts =
    currentMode === "multiple" ? getPromptsFromText() : [promptText];
  if (prompts.length === 0) {
    showStatus("Enter at least one prompt.", "warning");
    return;
  }

  if (currentMode === "multiple") {
    const confirmed = window.confirm(
      `Queue mode will process ${prompts.length} prompt(s).\n\n` +
        `${prompts
          .map((prompt, index) => `${index + 1}. ${prompt.slice(0, 60)}`)
          .join("\n")}\n\n` +
        `Media: ${generationOptions.mediaType}\n` +
        `Mode: ${generationOptions.videoMode}\n` +
        `Orientation: ${generationOptions.orientation}\n` +
        `Count: x${generationOptions.variantCount}\n` +
        `Model: ${generationOptions.model}\n` +
        `Delay between prompts: ${delayBetweenInput.value}s\n\nContinue?`,
    );
    if (!confirmed) {
      return;
    }
  }

  lockRun(currentMode, prompts.length);
  showStatus(
    currentMode === "multiple"
      ? `Starting queue for ${prompts.length} prompt(s)...`
      : "Starting generation...",
    "info",
  );

  try {
    const targetTab = await ensureTargetTab(url);
    const healthy = await isFlowTabHealthy(targetTab.id);
    if (!healthy) {
      showStatus(
        "Flow page is in Application error state. Refresh the tab first.",
        "error",
      );
      unlockRun();
      return;
    }

    await ensureContentScriptReady(targetTab.id);
    if (activeRun) {
      activeRun.tabId = targetTab.id;
      activeRun.projectUrl = normalizeFlowUrl(targetTab.url || url);
    }

    const response = await runGenerationInTab(targetTab.id, {
      action:
        currentMode === "multiple" ? "startQueueGeneration" : "startGeneration",
      prompts,
      prompt: prompts[0],
      autoRetry: autoRetryCheckbox.checked,
      notifyComplete: notifyCompleteCheckbox.checked,
      delayBetween: (Number.parseInt(delayBetweenInput.value, 10) || 10) * 1000,
      reloadAfterComplete: false,
      skipStyleAutomation: true,
      generationOptions,
    });

    if (response?.success) {
      if (currentMode === "multiple") {
        showStatus(`Queue started for ${prompts.length} prompt(s).`, "success");
      } else {
        showStatus("Generation started successfully.", "success");
      }
    } else {
      showStatus(
        response?.error || response?.message || "Generation did not start.",
        "error",
      );
      unlockRun();
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, "error");
    unlockRun();
  }
});

stopBtn.addEventListener("click", async () => {
  if (!activeRun) {
    showStatus("No active run to stop.", "warning");
    return;
  }

  stopBtn.disabled = true;
  showStatus("Stopping current run...", "warning");

  try {
    const stopResult = await sendControlActionToProjectTabs(
      "stopGeneration",
      activeRun.tabId || null,
    );

    unlockRun();
    if (stopResult.successCount > 0) {
      showStatus("Stopped automation.", "success");
    } else {
      showStatus(
        "Stop request sent, but no active project tab responded.",
        "warning",
      );
    }
  } catch (error) {
    unlockRun();
    showStatus(`Stop failed: ${error.message}`, "error");
  }
});

clearBtn.addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Clear all extension data and prompt fields?",
  );
  if (!confirmed) {
    return;
  }

  if (activeRun) {
    showStatus("Stopping run before clearing data...", "warning");
    try {
      await sendControlActionToProjectTabs(
        "stopGeneration",
        activeRun.tabId || null,
      );
    } catch (error) {
      console.warn("Stop before clear failed:", error);
    }
    unlockRun();
  }

  try {
    await sendControlActionToProjectTabs("clearAutomationData");
  } catch (error) {
    console.warn("Clear automation data in project tabs failed:", error);
  }

  chrome.storage.local.set(
    {
      ...defaultSettings,
      projectUrl: "",
      projectId: "",
      prompt: "",
    },
    () => {
      resetPopupFieldsToDefaults();
      showStatus("Cleared all data.", "success");
    },
  );
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "updateStatus") {
    showStatus(message.message, message.type || "info");

    if (activeRun) {
      const statusText = String(message.message || "").toLowerCase();
      const isQueueDone = statusText.includes("queue complete");
      const isSingleDone = statusText.includes("generation complete");
      const isStopped = statusText.includes("stopped");
      const isSingleFailed =
        activeRun.mode === "single" && message.type === "error";

      if (isQueueDone || isSingleDone || isStopped || isSingleFailed) {
        unlockRun();
      }
    }
    return;
  }

  if (message.action === "queueProgress") {
    if (
      activeRun?.mode === "multiple" &&
      typeof message.current === "number" &&
      typeof message.total === "number"
    ) {
      runBtn.textContent = `Running (${message.current}/${message.total})...`;
    }
    showStatus(message.message, message.type || "info");
  }
});
