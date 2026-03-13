import fs from "node:fs";
import path from "node:path";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizePathSegment(value) {
  return String(value ?? "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "Default";
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeCopyRecursive(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return;

  let sourceStat;
  try {
    sourceStat = fs.statSync(sourcePath);
  } catch {
    return;
  }

  if (sourceStat.isDirectory()) {
    ensureDir(targetPath);
    let entries = [];
    try {
      entries = fs.readdirSync(sourcePath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === "SingletonLock" || entry.name === "SingletonSocket" || entry.name === "SingletonCookie") {
        continue;
      }
      safeCopyRecursive(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name)
      );
    }
    return;
  }

  ensureDir(path.dirname(targetPath));
  try {
    fs.copyFileSync(sourcePath, targetPath);
  } catch {
    // Skip files that are locked by the running Chrome profile.
  }
}

function prepareAutomationUserDataDir(sourceUserDataDir, profileDirectory) {
  const automationRoot =
    process.env.FLOW_CHROME_AUTOMATION_DIR ||
    path.join(process.cwd(), ".flow-chrome-runtime");
  const targetUserDataDir = path.join(automationRoot, sanitizePathSegment(profileDirectory));

  ensureDir(targetUserDataDir);

  if (sourceUserDataDir) {
    safeCopyRecursive(
      path.join(sourceUserDataDir, "Local State"),
      path.join(targetUserDataDir, "Local State")
    );
    safeCopyRecursive(
      path.join(sourceUserDataDir, profileDirectory),
      path.join(targetUserDataDir, profileDirectory)
    );
  }

  return targetUserDataDir;
}

function resolveImportedModule(namespace) {
  return namespace?.default ?? namespace;
}

async function loadAutomationLibrary() {
  const errors = [];

  try {
    const playwright = await import("playwright");
    return { name: "playwright", module: resolveImportedModule(playwright), errors };
  } catch (error) {
    errors.push(`playwright: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const puppeteer = await import("puppeteer");
    return { name: "puppeteer", module: resolveImportedModule(puppeteer), errors };
  } catch (error) {
    errors.push(`puppeteer: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const puppeteerCore = await import("puppeteer-core");
    return { name: "puppeteer-core", module: resolveImportedModule(puppeteerCore), errors };
  } catch (error) {
    errors.push(`puppeteer-core: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { name: null, module: null, errors };
}

function detectChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function detectUserDataDir() {
  if (process.env.FLOW_CHROME_USER_DATA_DIR && fs.existsSync(process.env.FLOW_CHROME_USER_DATA_DIR)) {
    return process.env.FLOW_CHROME_USER_DATA_DIR;
  }
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;
  const candidate = path.join(localAppData, "Google", "Chrome", "User Data");
  return fs.existsSync(candidate) ? candidate : null;
}

function resolveProfileDirectory(userDataDir, requestedProfile) {
  const requested = String(requestedProfile ?? process.env.FLOW_CHROME_PROFILE ?? "").trim();
  if (!userDataDir) return requested || "Default";
  const localStatePath = path.join(userDataDir, "Local State");
  if (!fs.existsSync(localStatePath)) return requested || "Default";

  try {
    const localState = JSON.parse(fs.readFileSync(localStatePath, "utf8"));
    const infoCache = localState?.profile?.info_cache ?? {};

    if (requested) {
      const requestedLower = requested.toLowerCase();
      for (const [dir, meta] of Object.entries(infoCache)) {
        const visibleName = meta && typeof meta === "object" ? String(meta.name ?? "").trim() : "";
        if (dir.toLowerCase() === requestedLower || visibleName.toLowerCase() === requestedLower) {
          return dir;
        }
      }
      return requested;
    }

    for (const [dir, meta] of Object.entries(infoCache)) {
      if (meta && typeof meta === "object" && String(meta.name ?? "").toLowerCase() === "work") {
        return dir;
      }
    }
  } catch {
    // ignore
  }
  return "Default";
}

function normalizeProjectUrl(input, projectId) {
  const fallback = "https://labs.google/fx/tools/flow/project/";
  const normalizedProjectId = String(projectId ?? "").trim();
  if (normalizedProjectId) {
    return `${fallback}${normalizedProjectId}`;
  }
  const raw = String(input ?? "").trim();
  if (!raw) return fallback;
  if (/^[a-z0-9-]+$/i.test(raw)) return `${fallback}${raw}`;
  if (!/^https?:\/\//i.test(raw)) return fallback;
  if (/^https?:\/\/flow\.google\.com\//i.test(raw)) {
    return raw.replace(/^https?:\/\/flow\.google\.com\//i, "https://labs.google/");
  }
  return raw;
}

async function inspectFlowPage(page) {
  try {
    return await page.evaluate(() => {
      const bodyText = document.body?.innerText ?? "";
      const normalized = bodyText.toLowerCase();
      const editable = document.querySelector('textarea, [contenteditable="true"], [role="textbox"]');
      return {
        url: window.location.href,
        hasEditableField: Boolean(editable),
        signInRequired:
          normalized.includes("sign in") ||
          normalized.includes("continue to google") ||
          normalized.includes("choose an account"),
        missingProject:
          normalized.includes("there doesn't seem to be anything here") ||
          normalized.includes("something went wrong fetching your media"),
      };
    });
  } catch {
    return {
      url: "",
      hasEditableField: false,
      signInRequired: false,
      missingProject: false,
    };
  }
}

async function insertPrompt(page, prompt) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inserted = await page.evaluate((value) => {
      const editable =
        document.querySelector("textarea") ||
        document.querySelector('[contenteditable="true"]') ||
        document.querySelector('[role="textbox"]');

      if (!editable) return false;

      if (typeof editable.focus === "function") {
        editable.focus();
      }
      if (typeof editable.click === "function") {
        editable.click();
      }

      if ("value" in editable) {
        editable.value = value;
        editable.dispatchEvent(new Event("input", { bubbles: true }));
        editable.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }

      editable.textContent = value;
      editable.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
      editable.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }, prompt);

    if (inserted) return true;
    await delay(1500);
  }

  return false;
}

async function launchWithPlaywright(playwright, options) {
  const context = await playwright.chromium.launchPersistentContext(options.userDataDir, {
    headless: false,
    executablePath: options.executablePath ?? undefined,
    args: [`--profile-directory=${options.profileDirectory}`],
    viewport: { width: 1440, height: 900 },
  });
  const page = context.pages()[0] ?? (await context.newPage());
  return { page, close: async () => context.close() };
}

async function launchWithPuppeteer(puppeteer, options) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: options.executablePath ?? undefined,
    userDataDir: options.userDataDir ?? undefined,
    args: [`--profile-directory=${options.profileDirectory}`],
    defaultViewport: { width: 1440, height: 900 },
  });
  const pages = await browser.pages();
  const page = pages[0] ?? (await browser.newPage());
  return { page, close: async () => browser.close() };
}

async function connectExistingWithPlaywright(playwright, options) {
  const browser = await playwright.chromium.connectOverCDP(`http://127.0.0.1:${options.debugPort}`);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const pages = context.pages();
  return {
    browser,
    context,
    pages,
    close: async () => browser.close(),
    disconnect: async () => browser.close(),
  };
}

async function connectExistingWithPuppeteer(puppeteer, options) {
  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${options.debugPort}`,
    defaultViewport: null,
  });
  const pages = await browser.pages();
  return {
    browser,
    pages,
    close: async () => browser.disconnect(),
    disconnect: async () => browser.disconnect(),
  };
}

function normalizeForMatch(url) {
  return String(url ?? "").replace(/\/+$/, "").toLowerCase();
}

function extractProjectIdFromUrl(url) {
  const value = String(url ?? "");
  const match = value.match(/\/flow\/project\/([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? "";
}

async function findMatchingPage(pages, projectUrl) {
  const target = normalizeForMatch(projectUrl);
  const targetProjectId = extractProjectIdFromUrl(projectUrl);

  for (const page of pages) {
    let currentUrl = "";
    try {
      currentUrl = page.url();
    } catch {
      continue;
    }

    const normalizedCurrent = normalizeForMatch(currentUrl);
    const currentProjectId = extractProjectIdFromUrl(currentUrl);

    if (normalizedCurrent === target) return page;
    if (targetProjectId && currentProjectId === targetProjectId) return page;
  }

  return null;
}

async function connectToExistingChrome(automation, options, projectUrl) {
  const connection =
    automation.name === "playwright"
      ? await connectExistingWithPlaywright(automation.module, options)
      : await connectExistingWithPuppeteer(automation.module, options);

  const page = (await findMatchingPage(connection.pages, projectUrl)) ||
    (automation.name === "playwright"
      ? await connection.context.newPage()
      : await connection.browser.newPage());

  return {
    page,
    close: connection.close,
    connectedToExistingChrome: true,
  };
}

async function collectMediaUrls(page) {
  try {
    return await page.evaluate(() => {
      const urls = Array.from(document.querySelectorAll("video, img"))
        .map((node) => node.currentSrc || node.src || "")
        .filter(Boolean);
      return Array.from(new Set(urls));
    });
  } catch {
    return [];
  }
}

export async function generateMediaWithFlowAutomation(options = {}) {
  const prompt = String(options.prompt ?? "").trim();
  if (!prompt) {
    return { success: false, error: "Prompt is required." };
  }

  const projectUrl = normalizeProjectUrl(options.projectUrl, options.projectId);
  const keepOpen = options.keepOpen !== false;
  const executablePath = detectChromeExecutable();
  const sourceUserDataDir = detectUserDataDir();
  const requestedProfile = String(options.chromeProfile ?? "").trim();
  const profileDirectory = resolveProfileDirectory(sourceUserDataDir, requestedProfile);
  const connectExistingChrome = options.connectExistingChrome !== false;
  const chromeDebugPort = Number(options.chromeDebugPort || 9222);
  const userDataDir = connectExistingChrome
    ? null
    : prepareAutomationUserDataDir(sourceUserDataDir, profileDirectory);
  const automation = await loadAutomationLibrary();

  if (!automation?.module || !automation?.name) {
    return {
      success: false,
      error:
        automation?.errors?.length
          ? `Browser automation could not be loaded. ${automation.errors.join(" | ")}`
          : "No browser automation library installed. Install playwright or puppeteer to use backend automation.",
      pageUrl: projectUrl,
      sourceUserDataDir,
      userDataDir,
      profileDirectory,
      requestedProfile,
      connectedToExistingChrome: connectExistingChrome,
      debugPort: chromeDebugPort,
      keepOpen,
    };
  }

  if (!sourceUserDataDir) {
    return {
      success: false,
      error: "Chrome user data directory was not found on this machine.",
      pageUrl: projectUrl,
      browserLibrary: automation.name,
      sourceUserDataDir,
      userDataDir,
      requestedProfile,
      connectedToExistingChrome: connectExistingChrome,
      debugPort: chromeDebugPort,
      keepOpen,
    };
  }

  let session;
  try {
    if (connectExistingChrome) {
      session = await connectToExistingChrome(
        automation,
        { debugPort: chromeDebugPort },
        projectUrl
      );
    } else {
      const launchOptions = {
        executablePath,
        userDataDir,
        profileDirectory,
      };
      session =
        automation.name === "playwright"
          ? await launchWithPlaywright(automation.module, launchOptions)
          : await launchWithPuppeteer(automation.module, launchOptions);
    }
  } catch (error) {
    const profileHint =
      requestedProfile || profileDirectory || "Work";
    return {
      success: false,
      error: connectExistingChrome
        ? `Could not connect to an existing Chrome debugging session on port ${chromeDebugPort}. Start Chrome with remote debugging and open the Flow link there first.`
        : (error instanceof Error ? error.message : "Flow automation failed."),
      message: connectExistingChrome
        ? `Start Chrome with remote debugging, for example: chrome.exe --remote-debugging-port=${chromeDebugPort} --profile-directory="${profileHint}"`
        : undefined,
      pageUrl: projectUrl,
      browserLibrary: automation.name,
      sourceUserDataDir,
      userDataDir,
      profileDirectory,
      requestedProfile,
      connectedToExistingChrome: connectExistingChrome,
      debugPort: chromeDebugPort,
      keepOpen,
    };
  }

  let shouldClose = true;

  try {
    const page = session.page;
    const currentUrl = typeof page.url === "function" ? page.url() : "";
    if (normalizeForMatch(currentUrl) !== normalizeForMatch(projectUrl)) {
      await page.goto(projectUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    }
    await delay(2500);

    const pageState = await inspectFlowPage(page);

    if (pageState.signInRequired) {
      return {
        success: false,
        error: "Google Flow opened, but this Chrome profile is not signed in.",
        message: "Sign in to Google in the launched Chrome profile, then run backend automation again.",
        pageUrl: page.url(),
        browserLibrary: automation.name,
        sourceUserDataDir,
        userDataDir,
        profileDirectory,
        requestedProfile,
        connectedToExistingChrome: connectExistingChrome,
        debugPort: chromeDebugPort,
        keepOpen,
      };
    }

    if (pageState.missingProject) {
      return {
        success: false,
        error: "The Flow project page is unavailable or this project URL is invalid for the current profile.",
        message: "Use a valid project URL from the same signed-in Flow profile, or open the base project page to create a new prompt.",
        pageUrl: page.url(),
        browserLibrary: automation.name,
        sourceUserDataDir,
        userDataDir,
        profileDirectory,
        requestedProfile,
        connectedToExistingChrome: connectExistingChrome,
        debugPort: chromeDebugPort,
        keepOpen,
      };
    }

    const inserted = await insertPrompt(page, prompt);

    const candidateMediaUrls = await collectMediaUrls(page);
    shouldClose = connectExistingChrome ? false : !(keepOpen && inserted);

    return {
      success: inserted,
      message: inserted
        ? connectExistingChrome
          ? "Prompt inserted into your already-open Chrome tab."
          : "Prompt inserted into Flow page. The Chrome window was kept open so you can continue there."
        : "Flow page opened, but no editable prompt field was found automatically.",
      pageUrl: page.url(),
      mediaUrl: candidateMediaUrls[0] ?? null,
      candidateMediaUrls,
      browserLibrary: automation.name,
      sourceUserDataDir,
      userDataDir,
      profileDirectory,
      requestedProfile,
      connectedToExistingChrome: connectExistingChrome,
      debugPort: chromeDebugPort,
      keepOpen,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Flow automation failed.",
      pageUrl: projectUrl,
      browserLibrary: automation.name,
      sourceUserDataDir,
      userDataDir,
      profileDirectory,
      requestedProfile,
      connectedToExistingChrome: connectExistingChrome,
      debugPort: chromeDebugPort,
      keepOpen,
    };
  } finally {
    if (shouldClose) {
      await session.close().catch(() => {});
    }
  }
}
