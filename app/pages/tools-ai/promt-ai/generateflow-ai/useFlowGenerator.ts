"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FlowMediaType = "video" | "image";

export type FlowConfig = {
  projectId: string;
  projectUrl: string;
  toolSlug: string;
  licenseKey: string;
  chromeProfile: string;
  connectExistingChrome: boolean;
  chromeDebugPort: number;
  mediaType: FlowMediaType;
  model: string;
  videoMode: string;
  orientation: string;
  variantCount: number;
  autoRetry: boolean;
  notifyComplete: boolean;
  maxRetries: number;
};

type FlowGeneratorOptions = {
  defaultToolSlug?: string;
  defaultLicenseKey?: string;
  lockToolSlug?: boolean;
  lockLicenseKey?: boolean;
};

type QueueItem = {
  id: string;
  prompt: string;
  status: "pending" | "ready" | "submitted" | "completed";
  retries: number;
};

type BackendResult = {
  success: boolean;
  message?: string;
  pageUrl?: string;
  mediaUrl?: string | null;
  candidateMediaUrls?: string[];
  browserLibrary?: string;
  userDataDir?: string;
  profileDirectory?: string;
  requestedProfile?: string;
  connectedToExistingChrome?: boolean;
  debugPort?: number;
  error?: string;
  keepOpen?: boolean;
};

const FLOW_PROJECT_BASE_URL = "https://labs.google/fx/tools/flow/project/";
const FLOW_EXTENSION_PAGE_SOURCE = "edugroit-flow-page";
const FLOW_EXTENSION_SOURCE = "edugroit-flow-extension";
const FLOW_DEVICE_STORAGE_KEY = "edugroit-flow-device-id";
const FLOW_LICENSE_STORAGE_KEY = "edugroit-flow-license-state";

const baseConfig: FlowConfig = {
  projectId: "",
  projectUrl: FLOW_PROJECT_BASE_URL,
  toolSlug: "google-flow-auto-generator",
  licenseKey: "",
  chromeProfile: "Work",
  connectExistingChrome: true,
  chromeDebugPort: 9222,
  mediaType: "video",
  model: "Veo 3.1 - Fast",
  videoMode: "Ingredients",
  orientation: "Portrait",
  variantCount: 1,
  autoRetry: true,
  notifyComplete: true,
  maxRetries: 5,
};

const videoModels = [
  "Veo 3.1 - Fast",
  "Veo 3.1 - Fast [Lower Priority]",
  "Veo 3.1 - Quality",
] as const;

const imageModels = [
  "Nano Banana Pro",
  "Nano Banana 2",
  "Imagen 4",
] as const;

function readLines(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractProjectId(input: string) {
  const value = String(input ?? "").trim();
  if (!value) return "";
  const fromUrl = value.match(/\/flow\/project\/([^/?#]+)/i);
  if (fromUrl?.[1]) return fromUrl[1].trim();
  if (/^[a-z0-9-]+$/i.test(value)) return value;
  return "";
}

function buildProjectUrl(projectId: string) {
  const normalizedId = String(projectId ?? "").trim();
  return normalizedId ? `${FLOW_PROJECT_BASE_URL}${normalizedId}` : FLOW_PROJECT_BASE_URL;
}

function mergeFlowConfig(current: FlowConfig, updates: Partial<FlowConfig>): FlowConfig {
  const nextConfig = { ...current, ...updates };

  if (Object.prototype.hasOwnProperty.call(updates, "projectId")) {
    nextConfig.projectId = String(updates.projectId ?? "").trim();
    nextConfig.projectUrl = buildProjectUrl(nextConfig.projectId);
    return nextConfig;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "projectUrl")) {
    nextConfig.projectUrl = String(updates.projectUrl ?? "").trim() || FLOW_PROJECT_BASE_URL;
    nextConfig.projectId = extractProjectId(nextConfig.projectUrl);
  }

  return nextConfig;
}

export function useFlowGenerator(options: FlowGeneratorOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const extensionStopRequestedRef = useRef(false);
  const extensionRequestIdRef = useRef(0);
  const extensionResolversRef = useRef(
    new Map<
      string,
      {
        resolve: (value: Record<string, unknown>) => void;
        reject: (reason?: unknown) => void;
        timeout: number;
      }
    >()
  );
  const [promptInput, setPromptInput] = useState("A cinematic drone shot over Angkor Wat at sunrise.");
  const [isReady, setIsReady] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [extensionRunning, setExtensionRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Worker not initialized.");
  const [statusCode, setStatusCode] = useState("idle");
  const [error, setError] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activePrompt, setActivePrompt] = useState<QueueItem | null>(null);
  const resolvedToolSlug = (options.defaultToolSlug || "").trim() || baseConfig.toolSlug;
  const resolvedLicenseKey = options.defaultLicenseKey ?? "";
  const [config, setConfigState] = useState<FlowConfig>(() => ({
    ...baseConfig,
    toolSlug: resolvedToolSlug,
    licenseKey: resolvedLicenseKey,
  }));
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendResult, setBackendResult] = useState<BackendResult | null>(null);

  const getOrCreateFlowDeviceId = useCallback(() => {
    if (typeof window === "undefined") return "";

    const stored = window.localStorage.getItem(FLOW_DEVICE_STORAGE_KEY) || "";
    if (stored.trim()) return stored.trim();

    const created =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `flow-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(FLOW_DEVICE_STORAGE_KEY, created);
    return created;
  }, []);

  const readLicenseState = useCallback(() => {
    if (typeof window === "undefined") {
      return {
        toolSlug: "",
        licenseKey: "",
        deviceId: "",
        token: "",
        expiresAt: "",
        nextCheckAt: "",
        websiteOrigin: "",
      };
    }

    const raw = window.localStorage.getItem(FLOW_LICENSE_STORAGE_KEY);
    if (!raw) {
      return {
        toolSlug: "",
        licenseKey: "",
        deviceId: "",
        token: "",
        expiresAt: "",
        nextCheckAt: "",
        websiteOrigin: "",
      };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<{
        toolSlug: string;
        licenseKey: string;
        deviceId: string;
        token: string;
        expiresAt: string;
        nextCheckAt: string;
        websiteOrigin: string;
      }>;
      return {
        toolSlug: String(parsed.toolSlug || ""),
        licenseKey: String(parsed.licenseKey || ""),
        deviceId: String(parsed.deviceId || ""),
        token: String(parsed.token || ""),
        expiresAt: String(parsed.expiresAt || ""),
        nextCheckAt: String(parsed.nextCheckAt || ""),
        websiteOrigin: String(parsed.websiteOrigin || ""),
      };
    } catch {
      return {
        toolSlug: "",
        licenseKey: "",
        deviceId: "",
        token: "",
        expiresAt: "",
        nextCheckAt: "",
        websiteOrigin: "",
      };
    }
  }, []);

  const writeLicenseState = useCallback(
    (state: {
      toolSlug: string;
      licenseKey: string;
      deviceId: string;
      token: string;
      expiresAt: string;
      nextCheckAt: string;
      websiteOrigin: string;
    }) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(FLOW_LICENSE_STORAGE_KEY, JSON.stringify(state));
    },
    []
  );

  const callExtension = useCallback((action: string, payload: Record<string, unknown> = {}) => {
    if (typeof window === "undefined") {
      return Promise.reject(new Error("Browser extension bridge is only available in the browser."));
    }

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const requestId = `flow-${Date.now()}-${extensionRequestIdRef.current + 1}`;
      extensionRequestIdRef.current += 1;

      const timeout = window.setTimeout(() => {
        extensionResolversRef.current.delete(requestId);
        reject(new Error("Flow extension did not respond. Reload the extension and the website."));
      }, 4000);

      extensionResolversRef.current.set(requestId, { resolve, reject, timeout });
      window.postMessage(
        {
          source: FLOW_EXTENSION_PAGE_SOURCE,
          requestId,
          action,
          payload,
        },
        window.location.origin
      );
    });
  }, []);

  const syncLicenseStateToExtension = useCallback(
    async (state: {
      toolSlug: string;
      licenseKey: string;
      deviceId: string;
      token: string;
      expiresAt: string;
      nextCheckAt: string;
      websiteOrigin: string;
    }) => {
      if (typeof window === "undefined") return;
      try {
        await callExtension("storeLicenseState", { licenseState: state });
      } catch {
        // The website can still continue if the extension is not reachable right now.
      }
    },
    [callExtension]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const worker = new Worker(new URL("./flow-worker.js", import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (event) => {
      const data = event.data ?? {};
      const type = String(data.type ?? "");

      if (type === "ready") {
        setIsReady(true);
      }

      if (typeof data.message === "string") {
        setStatusMessage(data.message);
      }
      if (typeof data.status === "string") {
        setStatusCode(data.status);
      }
      if (Array.isArray(data.queue)) {
        setQueue(data.queue);
      }
      if (data.activePrompt && typeof data.activePrompt === "object") {
        setActivePrompt(data.activePrompt as QueueItem);
      } else if (data.activePrompt === null) {
        setActivePrompt(null);
      }
      if (data.config && typeof data.config === "object") {
        setConfigState((prev) => mergeFlowConfig(prev, data.config as Partial<FlowConfig>));
      }
      if (type === "queueUpdate") {
        setIsRunning(Boolean(data.running));
        setError("");
      }
      if (type === "error") {
        setError(typeof data.message === "string" ? data.message : "Flow worker error.");
        setIsRunning(Boolean(data.running));
      }
      if (type === "success") {
        setIsRunning(false);
        setError("");
      }
      if (type === "needsAction" && data.action === "open_flow_page" && typeof window !== "undefined") {
        window.open(
          String(data.url ?? FLOW_PROJECT_BASE_URL),
          "google-flow",
          "width=1400,height=900"
        );
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const pendingResolvers = extensionResolversRef.current;

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data ?? {};
      if (data.source !== FLOW_EXTENSION_SOURCE) return;

      if (data.type === "ready") {
        setExtensionInstalled(true);
        return;
      }

      if (data.type === "response" && typeof data.requestId === "string") {
        const pending = extensionResolversRef.current.get(data.requestId);
        if (!pending) return;

        window.clearTimeout(pending.timeout);
        extensionResolversRef.current.delete(data.requestId);

        if (data.error) {
          pending.reject(new Error(String(data.error)));
          return;
        }

        const response =
          data.response && typeof data.response === "object"
            ? (data.response as Record<string, unknown>)
            : {};

        if (response.ok === false) {
          pending.reject(new Error(String(response.error || "Flow extension request failed.")));
          return;
        }

        pending.resolve(response);
      }
    };

    window.addEventListener("message", handleWindowMessage);
    const pingTimer = window.setTimeout(() => {
      void callExtension("ping")
        .then(() => {
          setExtensionInstalled(true);
        })
        .catch(() => {
          setExtensionInstalled(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(pingTimer);
      window.removeEventListener("message", handleWindowMessage);
      for (const pending of pendingResolvers.values()) {
        window.clearTimeout(pending.timeout);
        pending.reject(new Error("Flow extension bridge was reset."));
      }
      pendingResolvers.clear();
    };
  }, [callExtension]);

  useEffect(() => {
    if (!extensionInstalled) return;
    const storedLicense = readLicenseState();
    if (!storedLicense.token || !storedLicense.toolSlug || !storedLicense.deviceId) return;
    void syncLicenseStateToExtension({
      ...storedLicense,
      websiteOrigin: storedLicense.websiteOrigin || window.location.origin,
    });
  }, [extensionInstalled, readLicenseState, syncLicenseStateToExtension]);

  const postToWorker = useCallback((action: string, payload: Record<string, unknown> = {}) => {
    workerRef.current?.postMessage({ action, ...payload });
  }, []);

  useEffect(() => {
    if (!options.lockToolSlug) return;
    const nextToolSlug = (options.defaultToolSlug || "").trim() || baseConfig.toolSlug;
    if (config.toolSlug === nextToolSlug) return;
    const nextConfig = mergeFlowConfig(config, { toolSlug: nextToolSlug });
    setConfigState(nextConfig);
    postToWorker("setConfig", { options: nextConfig });
  }, [config, options.defaultToolSlug, options.lockToolSlug, postToWorker]);

  useEffect(() => {
    if (!options.lockLicenseKey) return;
    const nextLicenseKey = options.defaultLicenseKey ?? "";
    if (config.licenseKey === nextLicenseKey) return;
    const nextConfig = mergeFlowConfig(config, { licenseKey: nextLicenseKey });
    setConfigState(nextConfig);
    postToWorker("setConfig", { options: nextConfig });
  }, [config, options.defaultLicenseKey, options.lockLicenseKey, postToWorker]);

  const setConfig = useCallback((updates: Partial<FlowConfig>) => {
    const guardedUpdates = { ...updates };
    if (options.lockToolSlug) {
      delete guardedUpdates.toolSlug;
    }
    if (options.lockLicenseKey) {
      delete guardedUpdates.licenseKey;
    }
    const nextConfig = mergeFlowConfig(config, guardedUpdates);
    setConfigState(nextConfig);
    postToWorker("setConfig", { options: nextConfig });
  }, [config, options.lockLicenseKey, options.lockToolSlug, postToWorker]);

  const startQueue = useCallback(() => {
    setBackendResult(null);
    setError("");
    postToWorker("startQueue", { promptInput });
    setIsRunning(true);
  }, [postToWorker, promptInput]);

  const stopQueue = useCallback(() => {
    postToWorker("stop");
    setIsRunning(false);
  }, [postToWorker]);

  const copyFlowLink = useCallback(async () => {
    const targetUrl = config.projectUrl || FLOW_PROJECT_BASE_URL;
    await navigator.clipboard.writeText(targetUrl);
    setError("");
    setStatusMessage("Flow link copied. Open it in the Chrome profile you want.");
    setStatusCode("link_copied");
    return targetUrl;
  }, [config.projectUrl]);

  const markSubmitted = useCallback(() => {
    postToWorker("markSubmitted");
  }, [postToWorker]);

  const markCompleted = useCallback(() => {
    postToWorker("markCompleted");
  }, [postToWorker]);

  const copyActivePrompt = useCallback(async () => {
    if (!activePrompt?.prompt) return false;
    await navigator.clipboard.writeText(activePrompt.prompt);
    return true;
  }, [activePrompt]);

  const runBackendAutomation = useCallback(async () => {
    const prompts = readLines(promptInput);
    if (prompts.length === 0) {
      setError("Add at least one prompt before running backend automation.");
      return;
    }

    setBackendLoading(true);
    setBackendResult(null);
    setError("");

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompts[0],
          projectId: config.projectId,
          projectUrl: config.projectUrl,
          chromeProfile: config.chromeProfile,
          connectExistingChrome: config.connectExistingChrome,
          chromeDebugPort: config.chromeDebugPort,
          mediaType: config.mediaType,
          model: config.model,
          videoMode: config.videoMode,
          orientation: config.orientation,
          variantCount: config.variantCount,
          autoRetry: config.autoRetry,
          notifyComplete: config.notifyComplete,
          maxRetries: config.maxRetries,
          keepOpen: true,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as BackendResult;
      if (!res.ok) {
        throw new Error(data.error || data.message || "Backend automation failed.");
      }

      setBackendResult(data);
      setStatusMessage(data.message || "Backend automation finished.");
      setStatusCode(data.success ? "backend_completed" : "backend_failed");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Backend automation failed.";
      setError(message);
      setBackendResult({ success: false, error: message });
    } finally {
      setBackendLoading(false);
    }
  }, [config, promptInput]);

  const activateExtensionLicense = useCallback(async () => {
    try {
      if (!config.licenseKey.trim()) {
        throw new Error("Enter the Flow license key first.");
      }

      setError("");
      const deviceId = getOrCreateFlowDeviceId();
      const response = await fetch("/api/tools/license/activate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: config.toolSlug,
          licenseKey: config.licenseKey,
          deviceId,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        token?: string;
        expiresAt?: string | null;
        nextCheckAt?: string | null;
        error?: string;
      };
      if (!response.ok || !data.ok || !data.token) {
        throw new Error(
          data.error ||
            (response.status === 401
              ? "Log in on your website first, then activate the Flow license."
              : "Flow license activation failed.")
        );
      }

      const nextLicenseState = {
        toolSlug: config.toolSlug.trim(),
        licenseKey: config.licenseKey.trim(),
        deviceId,
        token: String(data.token || ""),
        expiresAt: String(data.expiresAt || ""),
        nextCheckAt: String(data.nextCheckAt || ""),
        websiteOrigin: window.location.origin,
      };
      writeLicenseState(nextLicenseState);
      void syncLicenseStateToExtension(nextLicenseState);
      setStatusMessage(`Extension license activated for ${config.toolSlug.trim()}.`);
      setStatusCode("extension_license_ready");
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extension license activation failed.";
      setError(message);
      setStatusCode("extension_license_failed");
      throw err;
    }
  }, [
    config.licenseKey,
    config.toolSlug,
    getOrCreateFlowDeviceId,
    syncLicenseStateToExtension,
    writeLicenseState,
  ]);

  const runExtensionAutomation = useCallback(async () => {
    try {
      if (!extensionInstalled) {
        throw new Error("Flow extension not detected. Reload the extension and this page first.");
      }
      if (!readLines(promptInput).length) {
        throw new Error("Add at least one prompt before running the extension.");
      }

      setError("");
      extensionStopRequestedRef.current = false;
      setExtensionRunning(true);
      setStatusMessage("Extension automation starting...");
      setStatusCode("extension_starting");

      const deviceId = getOrCreateFlowDeviceId();
      const storedLicense = readLicenseState();
      let licenseState = {
        toolSlug: config.toolSlug.trim(),
        licenseKey: config.licenseKey.trim(),
        deviceId,
        token: storedLicense.token,
        expiresAt: storedLicense.expiresAt,
        nextCheckAt: storedLicense.nextCheckAt,
        websiteOrigin: storedLicense.websiteOrigin || window.location.origin,
      };

      const needsNewToken =
        !licenseState.token ||
        storedLicense.toolSlug !== licenseState.toolSlug ||
        storedLicense.licenseKey !== licenseState.licenseKey ||
        storedLicense.deviceId !== licenseState.deviceId;

      if (needsNewToken) {
        await activateExtensionLicense();
        const refreshed = readLicenseState();
        licenseState = {
          toolSlug: config.toolSlug.trim(),
          licenseKey: config.licenseKey.trim(),
          deviceId,
          token: refreshed.token,
          expiresAt: refreshed.expiresAt,
          nextCheckAt: refreshed.nextCheckAt,
          websiteOrigin: refreshed.websiteOrigin || window.location.origin,
        };
      } else if (
        licenseState.nextCheckAt &&
        new Date(licenseState.nextCheckAt).getTime() <= Date.now()
      ) {
        const response = await fetch("/api/tools/license/heartbeat", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${licenseState.token}`,
          },
          body: JSON.stringify({
            slug: licenseState.toolSlug,
            deviceId: licenseState.deviceId,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          token?: string;
          expiresAt?: string | null;
          nextCheckAt?: string | null;
          error?: string;
          reason?: string;
        };
        if (!response.ok || !data.ok || !data.token) {
          throw new Error(data.error || data.reason || "Flow license heartbeat failed.");
        }
        licenseState = {
          ...licenseState,
          token: String(data.token || ""),
          expiresAt: String(data.expiresAt || ""),
          nextCheckAt: String(data.nextCheckAt || ""),
          websiteOrigin: licenseState.websiteOrigin || window.location.origin,
        };
        writeLicenseState(licenseState);
        void syncLicenseStateToExtension(licenseState);
      }

      const prompts = readLines(promptInput);
      for (let index = 0; index < prompts.length; index += 1) {
        if (extensionStopRequestedRef.current) {
          throw new Error("Stopped by user.");
        }

        let currentStep = 0;
        setStatusMessage(`Executing prompt ${index + 1} of ${prompts.length}...`);
        setStatusCode("extension_running");

        while (!extensionStopRequestedRef.current) {
          const taskResponse = await fetch("/api/flow-task", {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${licenseState.token}`,
              "x-tool-slug": licenseState.toolSlug,
              "x-device-id": licenseState.deviceId,
            },
            body: JSON.stringify({
              prompt: prompts[index],
              currentStep,
              deviceId: licenseState.deviceId,
              toolSlug: licenseState.toolSlug,
              generationOptions: config,
            }),
          });

          const taskData = (await taskResponse.json().catch(() => ({}))) as
            | ({ success?: boolean; action?: string; nextStep?: number; error?: string } & Record<
                string,
                unknown
              >)
            | undefined;

          if (!taskResponse.ok || !taskData?.success) {
            throw new Error(String(taskData?.error || "Failed to get Flow task from backend."));
          }

          if (taskData.action === "complete") {
            break;
          }

          const extensionResponse = await callExtension("runTask", {
            projectId: config.projectId,
            projectUrl: config.projectUrl,
            task: taskData,
          });
          if (extensionResponse.ok === false) {
            throw new Error(String(extensionResponse.error || "Flow extension task failed."));
          }

          currentStep = Number(taskData.nextStep ?? currentStep + 1);
        }

        if (extensionStopRequestedRef.current) {
          throw new Error("Stopped by user.");
        }
      }

      setStatusMessage("Extension automation completed.");
      setStatusCode("extension_completed");
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extension automation failed to start.";
      setError(message);
      setStatusCode(
        message === "Stopped by user." ? "extension_stopped" : "extension_start_failed"
      );
      throw err;
    } finally {
      setExtensionRunning(false);
      extensionStopRequestedRef.current = false;
    }
  }, [
    activateExtensionLicense,
    callExtension,
    config,
    extensionInstalled,
    getOrCreateFlowDeviceId,
    promptInput,
    readLicenseState,
    syncLicenseStateToExtension,
    writeLicenseState,
  ]);

  const stopExtensionAutomation = useCallback(async () => {
    try {
      extensionStopRequestedRef.current = true;
      setError("");
      setStatusMessage("Stopping extension automation...");
      setStatusCode("extension_stopping");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop extension automation.";
      setError(message);
      setStatusCode("extension_stop_failed");
      throw err;
    }
  }, []);

  return {
    promptInput,
    setPromptInput,
    isReady,
    isRunning,
    statusMessage,
    statusCode,
    error,
    queue,
    activePrompt,
    config,
    setConfig,
    extensionInstalled,
    extensionRunning,
    copyFlowLink,
    startQueue,
    stopQueue,
    markSubmitted,
    markCompleted,
    copyActivePrompt,
    activateExtensionLicense,
    runExtensionAutomation,
    stopExtensionAutomation,
    backendLoading,
    backendResult,
    runBackendAutomation,
    videoModels,
    imageModels,
    flowProjectBaseUrl: FLOW_PROJECT_BASE_URL,
    lockToolSlug: Boolean(options.lockToolSlug),
    lockLicenseKey: Boolean(options.lockLicenseKey),
  };
}
