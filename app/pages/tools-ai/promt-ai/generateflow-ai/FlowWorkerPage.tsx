"use client";

import { useMemo } from "react";
import { useFlowGenerator } from "./useFlowGenerator";

type FlowWorkerPageProps = {
  sharedToolSlug?: string;
  sharedLicenseKey?: string;
  lockToolSlug?: boolean;
  lockLicenseKey?: boolean;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
      {children}
    </label>
  );
}

const cardClass =
  "rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-xl";
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-black dark:text-white dark:focus:border-cyan-400";
const checkboxCardClass =
  "rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-200";

export default function FlowWorkerPage({
  sharedToolSlug,
  sharedLicenseKey,
  lockToolSlug = false,
  lockLicenseKey = false,
}: FlowWorkerPageProps) {
  const {
    promptInput,
    setPromptInput,
    isReady,
    isRunning,
    extensionInstalled,
    extensionRunning,
    statusMessage,
    statusCode,
    error,
    queue,
    activePrompt,
    config,
    setConfig,
    activateExtensionLicense,
    copyFlowLink,
    runExtensionAutomation,
    stopExtensionAutomation,
    startQueue,
    stopQueue,
    markSubmitted,
    markCompleted,
    copyActivePrompt,
    backendLoading,
    backendResult,
    runBackendAutomation,
    videoModels,
    imageModels,
    flowProjectBaseUrl,
  } = useFlowGenerator({
    defaultToolSlug: sharedToolSlug,
    defaultLicenseKey: sharedLicenseKey,
    lockToolSlug,
    lockLicenseKey,
  });

  const promptCount = useMemo(
    () => promptInput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length,
    [promptInput]
  );

  const models = config.mediaType === "image" ? imageModels : videoModels;

  return (
    <div className="space-y-6 text-slate-900 dark:text-white">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-xl">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/10 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-500 dark:text-amber-300">Flow Queue Worker</p>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
              extensionInstalled
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200"
            }`}
          >
            {extensionInstalled ? "Extension Connected" : "Extension Not Detected"}
          </span>
        </div>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Manage Google Flow prompts from your website</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-200">
          The website can now drive the installed Flow extension directly. Keep the Flow project open in Chrome,
          activate the extension license once, then run the prompts from this page.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              void runExtensionAutomation().catch(() => undefined);
            }}
            disabled={!extensionInstalled || extensionRunning}
            className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {extensionRunning ? "Extension Running..." : "Run Extension Automation"}
          </button>
          <button
            type="button"
            onClick={() => {
              void activateExtensionLicense().catch(() => undefined);
            }}
            disabled={!extensionInstalled}
            className="rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Activate Extension License
          </button>
          <button
            type="button"
            onClick={() => {
              void stopExtensionAutomation().catch(() => undefined);
            }}
            disabled={!extensionRunning}
            className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-400 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Stop Extension
          </button>
          <button
            type="button"
            onClick={() => {
              void copyFlowLink();
            }}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-cyan-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:border-cyan-400"
          >
            Copy Flow Link
          </button>
          <button
            type="button"
            onClick={runBackendAutomation}
            disabled={backendLoading}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-amber-400 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {backendLoading ? "Running Backend..." : "Run Backend Instead"}
          </button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">Queue Setup</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">One prompt per line. The worker will track progress across the queue.</p>
          </div>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-slate-700 dark:bg-transparent dark:text-cyan-300">
            {promptCount} prompt{promptCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-5">
          <FieldLabel>Prompt Queue</FieldLabel>
          <textarea
            value={promptInput}
            onChange={(event) => setPromptInput(event.target.value)}
            className="mt-2 h-40 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 dark:border-slate-800 dark:bg-black dark:text-white dark:focus:border-cyan-400"
          />
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <FieldLabel>Project ID</FieldLabel>
            <input
              value={config.projectId}
              onChange={(event) => setConfig({ projectId: event.target.value })}
              placeholder="47f0ebc5-63bc-4352-9edf-7b89e5e03efd"
              className={inputClass}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Base link: {flowProjectBaseUrl}
            </p>
          </div>
          <div>
            <FieldLabel>Project URL</FieldLabel>
            <input
              value={config.projectUrl}
              onChange={(event) => setConfig({ projectUrl: event.target.value })}
              className={inputClass}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Paste the full URL or just enter the Project ID above.
            </p>
          </div>
          <div>
            <FieldLabel>Tool Slug</FieldLabel>
            <input
              value={config.toolSlug}
              onChange={(event) => setConfig({ toolSlug: event.target.value })}
              placeholder="promt-ai"
              readOnly={lockToolSlug}
              className={`${inputClass} ${lockToolSlug ? "cursor-not-allowed opacity-80" : ""}`}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              {lockToolSlug
                ? "Flow Queue uses the same Prompt AI tool slug."
                : "Must match the Flow tool product slug used for license activation."}
            </p>
          </div>
          <div>
            <FieldLabel>License Key</FieldLabel>
            <input
              value={config.licenseKey}
              onChange={(event) => setConfig({ licenseKey: event.target.value })}
              placeholder="LIC-TOOL-XXXX-XXXX"
              readOnly={lockLicenseKey}
              className={`${inputClass} ${lockLicenseKey ? "cursor-not-allowed opacity-80" : ""}`}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              {lockLicenseKey
                ? "Managed by Prompt AI license above. Users cannot change it here."
                : "Used by the extension bridge. Activate once before running from the website."}
            </p>
          </div>
          <div>
            <FieldLabel>Chrome Profile</FieldLabel>
            <input
              value={config.chromeProfile}
              onChange={(event) => setConfig({ chromeProfile: event.target.value })}
              placeholder="Work or roth"
              className={inputClass}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Used by backend automation only. For manual mode, copy the Flow link and open it in this profile yourself.
            </p>
          </div>
          <label className={checkboxCardClass}>
            <FieldLabel>Backend Mode</FieldLabel>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.connectExistingChrome}
                onChange={(event) => setConfig({ connectExistingChrome: event.target.checked })}
              />
              <span>Connect to already-open Chrome</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Requires Chrome to be started with remote debugging.
            </p>
          </label>
          <div>
            <FieldLabel>Debug Port</FieldLabel>
            <input
              type="number"
              min={1}
              value={config.chromeDebugPort}
              onChange={(event) => setConfig({ chromeDebugPort: Number(event.target.value || 9222) })}
              className={inputClass}
            />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Default is 9222 for an already-open Chrome debugging session.
            </p>
          </div>
          <div>
            <FieldLabel>Model</FieldLabel>
            <select
              value={config.model}
              onChange={(event) => setConfig({ model: event.target.value })}
              className={inputClass}
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Media Type</FieldLabel>
            <select
              value={config.mediaType}
              onChange={(event) =>
                setConfig({
                  mediaType: event.target.value as "video" | "image",
                  model: event.target.value === "image" ? imageModels[0] : videoModels[0],
                })
              }
              className={inputClass}
            >
              <option value="video">Video</option>
              <option value="image">Image</option>
            </select>
          </div>
          <div>
            <FieldLabel>Video Mode</FieldLabel>
            <select
              value={config.videoMode}
              onChange={(event) => setConfig({ videoMode: event.target.value })}
              className={inputClass}
            >
              <option value="Ingredients">Ingredients</option>
              <option value="Frames to Video">Frames to Video</option>
              <option value="Text to Video">Text to Video</option>
            </select>
          </div>
          <div>
            <FieldLabel>Orientation</FieldLabel>
            <select
              value={config.orientation}
              onChange={(event) => setConfig({ orientation: event.target.value })}
              className={inputClass}
            >
              <option value="Portrait">Portrait</option>
              <option value="Landscape">Landscape</option>
              <option value="Square">Square</option>
            </select>
          </div>
          <div>
            <FieldLabel>Variant Count</FieldLabel>
            <select
              value={String(config.variantCount)}
              onChange={(event) => setConfig({ variantCount: Number(event.target.value) })}
              className={inputClass}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="4">4</option>
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className={`flex items-center gap-3 ${checkboxCardClass}`}>
            <input
              type="checkbox"
              checked={config.autoRetry}
              onChange={(event) => setConfig({ autoRetry: event.target.checked })}
            />
            Auto retry current prompt
          </label>
          <label className={`flex items-center gap-3 ${checkboxCardClass}`}>
            <input
              type="checkbox"
              checked={config.notifyComplete}
              onChange={(event) => setConfig({ notifyComplete: event.target.checked })}
            />
            Browser notification on finish
          </label>
          <div className={checkboxCardClass}>
            <FieldLabel>Max Retries</FieldLabel>
            <input
              type="number"
              min={0}
              value={config.maxRetries}
              onChange={(event) => setConfig({ maxRetries: Number(event.target.value || 0) })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={startQueue}
            disabled={!isReady}
            className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? "Queue Running" : "Start Queue"}
          </button>
          <button
            type="button"
            onClick={stopQueue}
            className="rounded-2xl border border-rose-300 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-400 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200"
          >
            Stop Queue
          </button>
          <button
            type="button"
            onClick={() => {
              void copyActivePrompt();
            }}
            disabled={!activePrompt}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Copy Active Prompt
          </button>
          <button
            type="button"
            onClick={markSubmitted}
            disabled={!activePrompt}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-cyan-400 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark Submitted
          </button>
          <button
            type="button"
            onClick={markCompleted}
            disabled={!activePrompt}
            className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-400 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark Completed
          </button>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">Worker Status</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{statusMessage}</p>
          </div>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-slate-700 dark:bg-transparent dark:text-cyan-300">
            {statusCode}
          </span>
        </div>
        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}
        {activePrompt ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-black/40">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">Active Prompt</p>
            <p className="mt-2 text-sm text-slate-800 dark:text-slate-100">{activePrompt.prompt}</p>
          </div>
        ) : null}
        <div className="mt-4 space-y-2">
          {queue.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-black/30"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {index + 1}. {item.prompt}
                </p>
              </div>
              <span className="ml-4 rounded-full border border-slate-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {backendResult ? (
        <section className={cardClass}>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">Backend Result</p>
          <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <p>Status: {backendResult.success ? "success" : "failed"}</p>
            {backendResult.error ? <p>Error: {backendResult.error}</p> : null}
            {backendResult.message ? <p>Message: {backendResult.message}</p> : null}
            {backendResult.pageUrl ? <p>Page URL: {backendResult.pageUrl}</p> : null}
            {backendResult.mediaUrl ? <p>Media URL: {backendResult.mediaUrl}</p> : null}
            {backendResult.browserLibrary ? <p>Library: {backendResult.browserLibrary}</p> : null}
            {backendResult.requestedProfile ? <p>Requested profile: {backendResult.requestedProfile}</p> : null}
            {typeof backendResult.connectedToExistingChrome === "boolean" ? (
              <p>Connected to existing Chrome: {backendResult.connectedToExistingChrome ? "yes" : "no"}</p>
            ) : null}
            {backendResult.debugPort ? <p>Debug port: {backendResult.debugPort}</p> : null}
            {backendResult.profileDirectory ? <p>Profile: {backendResult.profileDirectory}</p> : null}
            {backendResult.userDataDir ? <p>User data dir: {backendResult.userDataDir}</p> : null}
            {typeof backendResult.keepOpen === "boolean" ? (
              <p>Browser kept open: {backendResult.keepOpen ? "yes" : "no"}</p>
            ) : null}
            {backendResult.candidateMediaUrls?.length ? (
              <div>
                <p>Candidate URLs:</p>
                <ul className="mt-1 list-disc pl-5">
                  {backendResult.candidateMediaUrls.map((url) => (
                    <li key={url} className="break-all">
                      {url}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
