// content.js
(() => {
  // Content script for Google Flow automation
  console.log("Google Flow Auto Generator content script loaded");
  const CONTENT_SCRIPT_VERSION = "2026-03-11-17";
  const VIDEO_MODELS = [
    "Veo 3.1 - Fast",
    "Veo 3.1 - Fast [Lower Priority]",
    "Veo 3.1 - Quality",
  ];
  const IMAGE_MODELS = ["🍌 Nano Banana Pro", "Nano Banana 2", "Imagen 4"];

  const PROMPT_SELECTORS = [
    'div[role="textbox"][data-slate-editor="true"][data-slate-node="value"][contenteditable="true"]',
    'div[role="textbox"][data-slate-editor="true"][contenteditable="true"]',
    'textarea[placeholder*="prompt"]',
    'textarea[placeholder*="Prompt"]',
    'textarea[aria-label*="prompt"]',
    'textarea[name*="prompt"]',
    '[contenteditable="true"][aria-label*="prompt"]',
    '[contenteditable="true"][data-placeholder*="prompt"]',
    '[contenteditable="true"][role="textbox"]',
    'div[role="textbox"]',
    'input[type="text"][placeholder*="prompt"]',
    "textarea",
    'input[type="text"]',
    '[contenteditable="true"]',
  ];

  const QUEUE_STATE_KEY = "__flow_auto_generator_queue_state_v1";
  let queueRunInProgress = false;
  const QUEUE_COMPLETION_POLL_MS = 2000;
  const QUEUE_COMPLETION_IDLE_MS = 15000;
  const QUEUE_COMPLETION_MIN_WAIT_MS = 30000;
  const STOPPED_ERROR_MESSAGE = "Stopped by user.";
  let stopRequested = false;
  let generationMonitorIntervalId = null;
  let generationMonitorTimeoutId = null;

  try {
    window.__flowAutoGeneratorCleanup?.();
  } catch (error) {
    console.warn(
      "Failed to clean up previous Flow Auto Generator instance:",
      error,
    );
  }

  // Configuration
  let config = {
    autoRetry: true,
    notifyComplete: true,
    reloadAfterComplete: false,
    skipStyleAutomation: true,
    maxRetries: 5,
    retryDelay: 3000,
    generationOptions: {
      mediaType: "video",
      videoMode: "ingredients",
      orientation: "landscape",
      variantCount: "1",
      model: "Veo 3.1 - Fast",
    },
  };

  function isProjectPage() {
    return /\/fx\/tools\/flow\/project\//.test(window.location.pathname);
  }

  function isEditablePrompt(element) {
    return Boolean(
      element &&
      (element.matches('textarea, input[type="text"], input:not([type])') ||
        element.isContentEditable ||
        element.getAttribute("contenteditable") === "true" ||
        element.getAttribute("role") === "textbox"),
    );
  }

  function normalizeText(text = "") {
    return String(text).toLowerCase().replace(/\s+/g, " ").trim();
  }

  function getDeepNormalizedText(element) {
    if (!element) return "";
    const parts = [
      element.textContent || "",
      element.getAttribute("aria-label") || "",
      element.getAttribute("title") || "",
      element.id || "",
    ];
    element.querySelectorAll("*").forEach((child) => {
      parts.push(child.textContent || "");
      parts.push(child.getAttribute("aria-label") || "");
      parts.push(child.getAttribute("title") || "");
    });
    return normalizeText(parts.join(" "));
  }

  function setNativeValue(element, value) {
    if ("value" in element) {
      const prototype = Object.getPrototypeOf(element);
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      if (descriptor?.set) {
        descriptor.set.call(element, value);
      } else {
        element.value = value;
      }
      return;
    }

    if (
      element.isContentEditable ||
      element.getAttribute("contenteditable") === "true"
    ) {
      element.textContent = value;
    }
  }

  function moveCaretToEnd(element) {
    if (!element || !element.isConnected || !document.contains(element)) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    try {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      // Ignore detached-node range errors while UI is re-rendering.
    }
  }

  function selectElementContents(element) {
    if (!element || !element.isConnected || !document.contains(element)) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    try {
      const range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      // Ignore detached-node range errors while UI is re-rendering.
    }
  }

  function isContentEditableElement(element) {
    return Boolean(
      element &&
      (element.isContentEditable ||
        element.getAttribute("contenteditable") === "true"),
    );
  }

  function isSlateEditorElement(element) {
    return Boolean(
      element &&
      (element.getAttribute("data-slate-editor") === "true" ||
        element.hasAttribute("data-slate-node") ||
        element.closest('[data-slate-editor="true"]')),
    );
  }

  function isSlateComposerPrompt(element) {
    if (!element) {
      return false;
    }

    if (
      element.matches(
        'div[role="textbox"][data-slate-editor="true"][data-slate-node="value"][contenteditable="true"]',
      )
    ) {
      return true;
    }

    if (
      element.matches(
        'div[role="textbox"][data-slate-editor="true"][contenteditable="true"]',
      ) &&
      element.getAttribute("aria-multiline") === "true"
    ) {
      return true;
    }

    const regionText = normalizeText(
      element.closest("form, section, div")?.textContent || "",
    );
    return regionText.includes("what do you want to create");
  }

  function getSlateTextValue(element) {
    if (!element) {
      return "";
    }

    const slateStrings = Array.from(
      element.querySelectorAll('[data-slate-string="true"]'),
    )
      .map((node) => node.textContent || "")
      .join("");
    if (slateStrings.trim()) {
      return slateStrings;
    }

    const clone = element.cloneNode(true);
    clone
      .querySelectorAll(
        '[data-slate-placeholder="true"], [data-slate-zero-width]',
      )
      .forEach((node) => node.remove());
    return clone.textContent || "";
  }

  function getEditableValue(element) {
    if (isSlateEditorElement(element)) {
      return getSlateTextValue(element);
    }

    if ("value" in element) {
      return element.value || "";
    }

    return element.textContent || element.innerText || "";
  }

  function dispatchEditableEvents(element, value = getEditableValue(element)) {
    const eventData = value ?? null;
    element.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        data: eventData,
        inputType: "insertText",
      }),
    );
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: eventData,
        inputType: "insertText",
      }),
    );
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function dispatchSlateFrameworkEvents(element) {
    // Slate already has text; send non-inserting sync events to avoid duplicate appends.
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: null,
        inputType: "insertReplacementText",
      }),
    );
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function triggerFrameworkSync(element, value) {
    element.focus();
    await wait(50);

    element.dispatchEvent(new Event("focus", { bubbles: true }));
    await wait(30);

    if (isContentEditableElement(element)) {
      if (isSlateEditorElement(element)) {
        dispatchSlateFrameworkEvents(element);
      } else {
        setNativeValue(element, value);
        dispatchEditableEvents(element, value);
      }
    } else {
      setNativeValue(element, value);
      dispatchEditableEvents(element, value);
    }
    await wait(50);

    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", code: "Tab", bubbles: true }),
    );
    element.dispatchEvent(
      new KeyboardEvent("keyup", { key: "Tab", code: "Tab", bubbles: true }),
    );
    await wait(30);

    if (typeof element.blur === "function") {
      element.blur();
    }
    element.dispatchEvent(new Event("blur", { bubbles: true }));
    await wait(120);

    element.focus();
    await wait(50);
  }

  function finalizePromptInput(element, prompt) {
    element.focus();
    moveCaretToEnd(element);
    if (isSlateEditorElement(element)) {
      dispatchSlateFrameworkEvents(element);
    } else {
      setNativeValue(element, prompt);
      dispatchEditableEvents(element, prompt);
    }
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }),
    );
    element.dispatchEvent(
      new KeyboardEvent("keyup", { key: " ", code: "Space", bubbles: true }),
    );
    element.dispatchEvent(new Event("focusout", { bubbles: true }));
    if (typeof element.blur === "function") {
      element.blur();
    }
    element.dispatchEvent(new Event("blur", { bubbles: false }));
    document.body?.focus?.();
  }

  function clearContentEditableText(element) {
    element.focus();
    selectElementContents(element);

    try {
      document.execCommand("delete", false, null);
    } catch (error) {
      console.warn(
        "execCommand delete failed for contenteditable prompt input:",
        error,
      );
    }

    if (getEditableValue(element)) {
      element.textContent = "";
    }

    element.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        data: null,
        inputType: "deleteContentBackward",
      }),
    );
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: null,
        inputType: "deleteContentBackward",
      }),
    );
  }

  async function typeContentEditableText(element, text, delay = 20) {
    element.focus();
    moveCaretToEnd(element);

    for (const character of text) {
      element.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: character,
          bubbles: true,
        }),
      );

      let inserted = false;
      try {
        inserted = document.execCommand("insertText", false, character);
      } catch (error) {
        console.warn(
          "execCommand insertText failed for contenteditable prompt input:",
          error,
        );
      }

      if (!inserted) {
        const currentValue = getEditableValue(element);
        element.textContent = `${currentValue}${character}`;
      }

      element.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          data: character,
          inputType: "insertText",
        }),
      );
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          data: character,
          inputType: "insertText",
        }),
      );
      element.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: character,
          bubbles: true,
        }),
      );

      await wait(delay);
    }
  }

  function pasteContentEditableText(element, text) {
    element.focus();
    // Always replace the whole prompt value, never append to existing text.
    selectElementContents(element);

    let clipboardData = null;
    try {
      clipboardData = new DataTransfer();
      clipboardData.setData("text/plain", text);
    } catch (error) {
      console.warn(
        "DataTransfer unavailable for contenteditable paste:",
        error,
      );
    }

    if (clipboardData) {
      try {
        element.dispatchEvent(
          new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData,
          }),
        );
      } catch (error) {
        console.warn(
          "ClipboardEvent paste failed for contenteditable prompt input:",
          error,
        );
      }
    }

    element.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        data: text,
        inputType: "insertFromPaste",
      }),
    );

    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, text);
    } catch (error) {
      console.warn(
        "execCommand insertText failed during paste simulation:",
        error,
      );
    }

    if (!inserted) {
      element.textContent = text;
    }

    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: text,
        inputType: "insertFromPaste",
      }),
    );
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function normalizeDenseText(text = "") {
    return normalizeText(text).replace(/\s+/g, "");
  }

  function getRepeatedPromptCount(actualValue, promptValue) {
    const denseActual = normalizeDenseText(actualValue);
    const densePrompt = normalizeDenseText(promptValue);
    if (!denseActual || !densePrompt) {
      return 0;
    }
    if (denseActual === densePrompt) {
      return 1;
    }
    if (denseActual.length % densePrompt.length !== 0) {
      return 0;
    }

    const repeatCount = denseActual.length / densePrompt.length;
    if (repeatCount < 2) {
      return 0;
    }

    return densePrompt.repeat(repeatCount) === denseActual ? repeatCount : 0;
  }

  async function setSlateComposerText(element, text) {
    const promptText = String(text ?? "");

    element.focus();
    moveCaretToEnd(element);
    await wait(40);

    clearContentEditableText(element);
    await wait(60);

    let inserted = false;
    try {
      inserted = document.execCommand("insertText", false, promptText);
    } catch (error) {
      console.warn("execCommand insertText failed for Slate editor:", error);
    }

    if (!inserted) {
      pasteContentEditableText(element, promptText);
    } else {
      dispatchSlateFrameworkEvents(element);
    }

    await wait(100);

    if (
      normalizeText(getEditableValue(element)) !== normalizeText(promptText)
    ) {
      pasteContentEditableText(element, promptText);
      await wait(100);
    }
  }

  async function writeClipboardTextSafe(text) {
    if (!navigator.clipboard?.writeText) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Clipboard write can be blocked by browser permissions; fallback path will still work.
      return false;
    }
  }

  function dispatchNativePasteEvents(element, text) {
    element.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        data: text,
        inputType: "insertFromPaste",
      }),
    );
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        data: text,
        inputType: "insertFromPaste",
      }),
    );
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function pasteTextIntoPromptField(element, text) {
    const valueToPaste = String(text ?? "");
    const clipboardReady = await writeClipboardTextSafe(valueToPaste);

    element.focus();
    element.click?.();
    await wait(40);

    if (isContentEditableElement(element)) {
      if (isSlateEditorElement(element)) {
        await setSlateComposerText(element, valueToPaste);
        return;
      }

      clearContentEditableText(element);
      await wait(80);

      // Prefer paste semantics for editor frameworks.
      pasteContentEditableText(element, valueToPaste);
      await wait(120);

      // If clipboard-style paste was ignored, fallback to direct editor set.
      if (
        normalizeText(getEditableValue(element)) !== normalizeText(valueToPaste)
      ) {
        await setContentEditableText(element, valueToPaste);
        await wait(80);
      }
      return;
    }

    // Native input/textarea path.
    const currentValue = getEditableValue(element);
    const hasRangeApi =
      typeof element.setRangeText === "function" &&
      typeof element.setSelectionRange === "function";

    if (hasRangeApi) {
      try {
        element.setSelectionRange(0, currentValue.length);
        dispatchNativePasteEvents(element, valueToPaste);
        element.setRangeText(valueToPaste, 0, currentValue.length, "end");
        await wait(80);
        return;
      } catch (error) {
        console.warn("setRangeText paste simulation failed:", error);
      }
    }

    if (clipboardReady) {
      try {
        element.select?.();
        document.execCommand("paste");
        await wait(80);
        if (
          normalizeText(getEditableValue(element)) ===
          normalizeText(valueToPaste)
        ) {
          return;
        }
      } catch (error) {
        console.warn("execCommand paste failed:", error);
      }
    }

    setNativeValue(element, valueToPaste);
    dispatchNativePasteEvents(element, valueToPaste);
  }

  async function setContentEditableText(element, text) {
    clearContentEditableText(element);
    await wait(100);

    if (!text) {
      return;
    }

    if (isSlateEditorElement(element)) {
      pasteContentEditableText(element, text);
      await wait(120);
    } else {
      await typeContentEditableText(element, text, 18);
    }

    try {
      document.execCommand("insertText", false, "");
    } catch (error) {
      console.warn(
        "execCommand commit failed for contenteditable prompt input:",
        error,
      );
    }

    if (normalizeText(getEditableValue(element)) !== normalizeText(text)) {
      element.textContent = text;
      dispatchEditableEvents(element, text);
    }
  }

  async function enterPromptText(element, prompt) {
    if (isContentEditableElement(element)) {
      await setContentEditableText(element, prompt);
      finalizePromptInput(element, prompt);
      await wait(250);
      return;
    }

    setNativeValue(element, "");
    dispatchEditableEvents(element, "");
    await typeText(element, prompt, 30);
    finalizePromptInput(element, prompt);
  }

  async function setPromptTextUltraSafe(element, prompt) {
    const promptText = String(prompt ?? "");
    if (!element) {
      return;
    }

    element.focus();
    await wait(60);

    if (!isContentEditableElement(element)) {
      setNativeValue(element, promptText);
      dispatchEditableEvents(element, promptText);
      await wait(120);
      return;
    }

    let inserted = false;
    try {
      document.execCommand("selectAll", false, null);
      inserted = document.execCommand("insertText", false, promptText);
    } catch (error) {
      inserted = false;
    }

    if (!inserted) {
      // Fallback: minimal text content change without deleting nodes.
      element.textContent = promptText;
    }

    dispatchEditableEvents(element, promptText);
    await wait(180);
  }

  async function validatePromptInField(element, expectedPrompt) {
    const actualValue = getEditableValue(element);
    const normalizedActual = normalizeText(actualValue);
    const normalizedExpected = normalizeText(expectedPrompt);

    console.log("Validating prompt in field:", {
      expected: normalizedExpected,
      actual: normalizedActual,
      match: normalizedActual === normalizedExpected,
      length: actualValue.length,
    });

    return normalizedActual === normalizedExpected;
  }

  async function ensurePromptCommitted(element, prompt, attempts = 10) {
    console.log(
      `Ensuring prompt committed (${attempts} attempts): "${prompt}"`,
    );

    for (let attempt = 1; attempt <= attempts; attempt++) {
      console.group(`Prompt commit attempt ${attempt}/${attempts}`);

      const existingValue = getEditableValue(element);
      console.log("Current textbox value:", {
        text: existingValue,
        length: existingValue.length,
        preview: existingValue.substring(0, 100),
      });

      const repeatedCount = getRepeatedPromptCount(existingValue, prompt);
      console.log("Repeated count check:", {
        repeatedCount,
        expectedPrompt: prompt,
        isDuplicated: repeatedCount > 1,
      });

      if (repeatedCount > 1) {
        console.warn(
          `DETECTED DUPLICATION: Prompt appears ${repeatedCount}x times! Resetting field.`,
        );
        if (isContentEditableElement(element)) {
          if (isSlateEditorElement(element)) {
            await setPromptTextUltraSafe(element, prompt);
          } else {
            clearContentEditableText(element);
            await wait(80);
            setNativeValue(element, prompt);
            dispatchEditableEvents(element, prompt);
          }
        } else {
          setNativeValue(element, prompt);
          dispatchEditableEvents(element, prompt);
        }
        await wait(250);
        const afterReset = getEditableValue(element);
        console.log("After reset, textbox contains:", {
          text: afterReset,
          length: afterReset.length,
        });
      }

      try {
        if (
          isContentEditableElement(element) &&
          isSlateEditorElement(element)
        ) {
          console.log("Setting via ultra-safe Slate method...");
          await setPromptTextUltraSafe(element, prompt);
          await wait(220);
        } else {
          console.log("Setting via paste method...");
          // Paste-first approach is more reliable than character typing for Flow.
          await pasteTextIntoPromptField(element, prompt);
          await wait(220);
        }

        await triggerFrameworkSync(element, prompt);
        finalizePromptInput(element, prompt);
        await wait(900);

        const beforeValidation = getEditableValue(element);
        console.log("Before validation, textbox contains:", {
          text: beforeValidation,
          length: beforeValidation.length,
          preview: beforeValidation.substring(0, 100),
        });

        let isCommitted = await validatePromptInField(element, prompt);
        console.log("First validation result:", isCommitted);

        if (!isCommitted) {
          console.warn("First validation failed, trying hard fallback...");
          // Hard fallback if paste path fails in this specific editor state.
          if (isContentEditableElement(element)) {
            if (isSlateEditorElement(element)) {
              await setPromptTextUltraSafe(element, prompt);
            } else {
              await setContentEditableText(element, prompt);
            }
          } else {
            setNativeValue(element, prompt);
            dispatchEditableEvents(element, prompt);
          }
          await triggerFrameworkSync(element, prompt);
          await wait(500);
          isCommitted = await validatePromptInField(element, prompt);
          console.log("Fallback validation result:", isCommitted);
        }

        if (isCommitted) {
          await wait(1000);
          const stableCheck = await validatePromptInField(element, prompt);
          console.log("Stability check result:", stableCheck);
          if (stableCheck) {
            element.focus();
            await wait(120);
            console.log(
              `✓ Prompt stable and committed after attempt ${attempt}`,
            );
            const finalValue = getEditableValue(element);
            console.log("Final committed value:", {
              text: finalValue,
              length: finalValue.length,
            });
            console.groupEnd();
            return;
          }
        }
      } catch (error) {
        console.warn(`Prompt commit attempt ${attempt} failed:`, error);
      }

      console.warn(
        `Attempt ${attempt}: Prompt not committed/stable yet. Will retry...`,
      );
      console.groupEnd();
      await wait(300);
    }

    const finalAttemptValue = getEditableValue(element);
    console.error("FAILED to commit prompt after all attempts", {
      lastValue: finalAttemptValue,
      expectedPrompt: prompt,
      attempts,
    });

    throw new Error(
      `Failed to commit prompt after ${attempts} attempts. Last value: "${finalAttemptValue}"`,
    );
  }

  function isStopError(error) {
    const message = String(error?.message || error || "").toLowerCase();
    return message.includes("stopped by user");
  }

  function throwIfStopRequested() {
    if (stopRequested) {
      throw new Error(STOPPED_ERROR_MESSAGE);
    }
  }

  function clearGenerationMonitor() {
    if (generationMonitorIntervalId) {
      clearInterval(generationMonitorIntervalId);
      generationMonitorIntervalId = null;
    }
    if (generationMonitorTimeoutId) {
      clearTimeout(generationMonitorTimeoutId);
      generationMonitorTimeoutId = null;
    }
  }

  function stopAutomation(reason = STOPPED_ERROR_MESSAGE, notify = true) {
    stopRequested = true;
    clearQueueStateV2();
    clearGenerationMonitor();

    if (notify) {
      chrome.runtime.sendMessage({
        action: "updateStatus",
        message: reason,
        type: "warning",
      });
    }

    return { success: true, stopped: true, message: reason };
  }

  async function wait(ms) {
    const totalMs = Math.max(0, Number(ms) || 0);
    const startAt = Date.now();

    while (Date.now() - startAt < totalMs) {
      throwIfStopRequested();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throwIfStopRequested();
  }

  function normalizeModelName(text = "") {
    return normalizeText(text)
      .replace(/^[^\w]+/, "")
      .trim();
  }

  function isVisible(element) {
    if (!element) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  function getElementTextSignature(element) {
    const parts = [
      element?.getAttribute?.("placeholder") || "",
      element?.getAttribute?.("aria-label") || "",
      element?.getAttribute?.("data-placeholder") || "",
      element?.getAttribute?.("name") || "",
      element?.id || "",
      element?.className || "",
      element?.textContent || "",
    ];

    return normalizeText(parts.join(" "));
  }

  function isLikelyPromptField(element) {
    if (!element || !isEditablePrompt(element) || !isVisible(element)) {
      return false;
    }

    if (isSlateComposerPrompt(element)) {
      return true;
    }

    if (element.matches('input[type="search"]')) {
      return false;
    }

    if (
      element.closest(
        '[role="menu"], [role="dialog"], [aria-modal="true"], [data-radix-menu-content]',
      )
    ) {
      return false;
    }

    const signature = getElementTextSignature(element);
    if (signature.includes("search") && !signature.includes("prompt")) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    // Reject Flow top search bar candidates (they cause "Prompt must be provided").
    const looksLikeHeaderSearchBox =
      !isContentEditableElement(element) &&
      rect.top < window.innerHeight * 0.35 &&
      rect.width > Math.min(window.innerWidth * 0.35, 420) &&
      rect.height <= 80;
    if (looksLikeHeaderSearchBox) {
      return false;
    }

    const hasPromptHint = /prompt|describe|description|scene|idea|story/.test(
      signature,
    );
    if (!hasPromptHint && (rect.width < 220 || rect.height < 28)) {
      return false;
    }

    return true;
  }

  function scorePromptCandidate(element, createButton = null) {
    let score = 0;
    const signature = getElementTextSignature(element);
    const rect = element.getBoundingClientRect();

    if (isSlateComposerPrompt(element)) {
      score += 320;
    }

    if (signature.includes("what do you want to create")) {
      score += 260;
    }

    if (element.matches("textarea")) {
      score += 40;
    }
    if (
      isContentEditableElement(element) ||
      element.getAttribute("role") === "textbox"
    ) {
      score += 25;
    }
    if (element.getAttribute("aria-multiline") === "true") {
      score += 50;
    }
    if (/prompt|describe|description|scene|idea|story/.test(signature)) {
      score += 120;
    }
    if (/search|filter/.test(signature)) {
      score -= 80;
    }

    // Flow composer usually sits near the bottom of the viewport.
    if (rect.bottom >= window.innerHeight * 0.72) {
      score += 180;
    } else if (rect.bottom >= window.innerHeight * 0.58) {
      score += 80;
    }

    if (createButton && element.isConnected) {
      const promptRect = rect;
      const createRect = createButton.getBoundingClientRect();
      const distance = Math.hypot(
        createRect.left - promptRect.left,
        createRect.top - promptRect.top,
      );
      score += Math.max(0, 160 - distance / 8);

      const sameForm =
        element.closest("form") &&
        createButton.closest("form") &&
        element.closest("form") === createButton.closest("form");
      if (sameForm) {
        score += 60;
      }
    }

    return score;
  }

  function findPromptInputCandidates(createButton = null, limit = 6) {
    const uniqueCandidates = new Set();

    for (const selector of PROMPT_SELECTORS) {
      const matched = document.querySelectorAll(selector);
      for (const element of matched) {
        if (isLikelyPromptField(element)) {
          uniqueCandidates.add(element);
        }
      }
    }

    const candidates = Array.from(uniqueCandidates);
    if (candidates.length === 0) {
      return [];
    }

    candidates.sort(
      (a, b) =>
        scorePromptCandidate(b, createButton) -
        scorePromptCandidate(a, createButton),
    );
    return candidates.slice(0, limit);
  }

  function getRectCenter(rect) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function getComposerPromptDistanceScore(element, submitButton) {
    if (
      !element ||
      !submitButton ||
      !element.isConnected ||
      !submitButton.isConnected
    ) {
      return 0;
    }

    const promptRect = element.getBoundingClientRect();
    const submitRect = submitButton.getBoundingClientRect();
    const promptCenter = getRectCenter(promptRect);
    const submitCenter = getRectCenter(submitRect);
    const distance = Math.hypot(
      submitCenter.x - promptCenter.x,
      submitCenter.y - promptCenter.y,
    );

    let score = Math.max(0, 420 - distance);
    if (promptRect.bottom >= window.innerHeight * 0.56) {
      score += 220;
    }
    if (promptRect.top < window.innerHeight * 0.36) {
      score -= 260;
    }
    return score;
  }

  function findComposerPromptCandidates(limit = 6) {
    const submitButton = findComposerSubmitButton(null) || findCreateButton();
    if (!submitButton) {
      return [];
    }

    const candidates = findPromptInputCandidates(submitButton, 12).filter(
      (element) => {
        const rect = element.getBoundingClientRect();
        const signature = getElementTextSignature(element);
        if (signature.includes("search") && !signature.includes("prompt")) {
          return false;
        }
        if (rect.top < 0 || rect.bottom < 0) {
          return false;
        }
        return rect.bottom >= window.innerHeight * 0.45;
      },
    );

    return candidates
      .map((element) => ({
        element,
        score:
          scorePromptCandidate(element, submitButton) +
          getComposerPromptDistanceScore(element, submitButton),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.element);
  }

  function findBestPromptInput(createButton = null) {
    return findPromptInputCandidates(createButton, 1)[0] || null;
  }

  async function waitForPromptInput(timeout = 15000) {
    const startTime = Date.now();

    while (Date.now() - startTime <= timeout) {
      const promptBox = findStylePromptBox();
      if (promptBox) {
        console.log(
          "[waitForPromptInput] ✓ Found prompt box using findStylePromptBox",
        );
        return promptBox;
      }
      await wait(120);
    }

    throw new Error(`Prompt input field not found within ${timeout}ms`);
  }

  // Wait for multiple possible selectors
  function waitForAnyElement(selectors, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && isEditablePrompt(element)) {
            resolve({ element, selector });
            return;
          }
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error(`None of the elements found within ${timeout}ms`));
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  }

  // Type text naturally (simulate human typing)
  function typeText(element, text, delay = 50) {
    return new Promise((resolve) => {
      element.focus();
      element.click();

      let index = 0;
      const typeChar = () => {
        if (index < text.length) {
          setNativeValue(element, text.substring(0, index + 1));
          dispatchEditableEvents(element);
          index++;
          setTimeout(typeChar, delay);
        } else {
          resolve();
        }
      };

      typeChar();
    });
  }

  // Use stable click simulation: pointer/mouse sequence + click.
  async function clickElement(element) {
    if (!element || !element.isConnected) {
      return;
    }

    element.scrollIntoView({ behavior: "auto", block: "center" });
    await wait(120);
    element.focus?.();
    const rect = element.getBoundingClientRect();
    const clientX = rect.left + Math.max(1, rect.width / 2);
    const clientY = rect.top + Math.max(1, rect.height / 2);
    const pointerInit = {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
    };
    const mouseInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX,
      clientY,
      button: 0,
      buttons: 1,
    };

    try {
      if (typeof PointerEvent === "function") {
        element.dispatchEvent(new PointerEvent("pointerdown", pointerInit));
      }
      element.dispatchEvent(new MouseEvent("mousedown", mouseInit));
      await wait(18);
      if (typeof PointerEvent === "function") {
        element.dispatchEvent(new PointerEvent("pointerup", pointerInit));
      }
      element.dispatchEvent(new MouseEvent("mouseup", mouseInit));
    } catch (error) {
      // Fall through to native click.
    }
    element.click();
    await wait(140);
  }

  async function nudgeFlowPageFocus() {
    const x = Math.max(8, Math.floor(window.innerWidth * 0.5));
    const y = Math.max(8, Math.floor(window.innerHeight * 0.6));
    const target = document.elementFromPoint(x, y) || document.body;
    if (!target) {
      return;
    }

    if (
      target.matches(
        'input, textarea, [contenteditable="true"], [role="textbox"]',
      )
    ) {
      return;
    }

    const mouseInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: 1,
    };

    try {
      target.dispatchEvent(new MouseEvent("mousedown", mouseInit));
      await wait(10);
      target.dispatchEvent(new MouseEvent("mouseup", mouseInit));
      target.dispatchEvent(new MouseEvent("click", mouseInit));
    } catch (error) {
      // Ignore focus nudge failures.
    }

    await wait(80);
  }

  function findStylePromptBox() {
    // Find all visible contenteditable textboxes and pick the one closest to bottom
    const allTextboxes = Array.from(
      document.querySelectorAll('div[role="textbox"][contenteditable="true"]'),
    ).filter(isVisible);

    console.log(
      `[findStylePromptBox] Found ${allTextboxes.length} total prompt textboxes`,
    );

    if (allTextboxes.length === 0) {
      console.log("[findStylePromptBox] ✗ No prompt textbox found");
      return null;
    }

    // Pick the one closest to bottom (always pick lowest = closest to window bottom)
    const selected = allTextboxes.reduce((best, current) => {
      const currentDist = Math.abs(
        window.innerHeight - current.getBoundingClientRect().bottom,
      );
      const bestDist = Math.abs(
        window.innerHeight - best.getBoundingClientRect().bottom,
      );
      return currentDist < bestDist ? current : best;
    });

    const rect = selected.getBoundingClientRect();
    console.log("[findStylePromptBox] ✓ Selected prompt textbox at:", {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      distFromBottom: Math.round(window.innerHeight - rect.bottom),
      tagName: selected.tagName,
      role: selected.getAttribute("role"),
    });

    return selected;
  }

  async function clickStylePromptBoxIfPresent() {
    // ONLY click the actual prompt input textbox at the BOTTOM
    const allTextboxes = Array.from(
      document.querySelectorAll('div[role="textbox"][contenteditable="true"]'),
    ).filter(isVisible);

    if (allTextboxes.length === 0) {
      console.log("[clickStylePromptBoxIfPresent] ✗ No prompt textbox found");
      return false;
    }

    // Pick the one CLOSEST TO BOTTOM (this is definitely the prompt input)
    const targetTextbox = allTextboxes.reduce((best, current) => {
      const currentDist = Math.abs(
        window.innerHeight - current.getBoundingClientRect().bottom,
      );
      const bestDist = Math.abs(
        window.innerHeight - best.getBoundingClientRect().bottom,
      );
      return currentDist < bestDist ? current : best;
    });

    const rect = targetTextbox.getBoundingClientRect();
    console.log(
      "[clickStylePromptBoxIfPresent] ✓ Clicking prompt textbox at:",
      {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        distFromBottom: Math.round(window.innerHeight - rect.bottom),
        height: Math.round(rect.height),
      },
    );

    await clickElement(targetTextbox);
    await wait(200);
    return true;
  }

  function getOpenMenus() {
    return Array.from(
      document.querySelectorAll('[role="menu"], [data-radix-menu-content]'),
    ).filter(
      (element) =>
        element.getAttribute("data-state") === "open" && isVisible(element),
    );
  }

  function getOpenGenerationMenu() {
    return (
      getOpenMenus().find((element) =>
        element.querySelector('button[role="tab"]'),
      ) || null
    );
  }

  function getOpenModelMenu() {
    return (
      getOpenMenus().find((element) =>
        element.querySelector('[role="menuitem"]'),
      ) || null
    );
  }

  function findVisibleModelChoice(modelName, root = document) {
    const wantedLabel = normalizeText(modelName);
    const candidates = Array.from(
      root.querySelectorAll('button, [role="menuitem"], [role="option"]'),
    ).filter(isVisible);
    return (
      candidates.find(
        (button) =>
          normalizeText(button.textContent || button.innerText || "") ===
          wantedLabel,
      ) ||
      candidates.find((button) =>
        normalizeText(button.textContent || button.innerText || "").includes(
          wantedLabel,
        ),
      ) ||
      null
    );
  }

  function findGenerationMenuTrigger() {
    return getGenerationMenuTriggersByPriority()[0] || null;
  }

  function getGenerationMenuTriggerMeta(button) {
    const combined = getDeepNormalizedText(button);
    const hasVariant = /\bx[1-4]\b/.test(combined);
    const hasModel = /(nano|banana|imagen|veo)/.test(combined);
    const hasOrientation = /(crop_9_16|crop_16_9|portrait|landscape)/.test(
      combined,
    );
    const hasMediaType = /\bimage\b|\bvideo\b|videocam/.test(combined);
    const likelyFlowOptionsTrigger =
      hasVariant && (hasModel || hasOrientation || hasMediaType);

    let score = 0;
    if (likelyFlowOptionsTrigger) {
      score += 800;
    }
    if (hasVariant) {
      score += 120;
    }
    if (hasModel) {
      score += 100;
    }
    if (hasOrientation) {
      score += 80;
    }
    if (hasMediaType) {
      score += 60;
    }
    if (
      (button?.getAttribute("aria-haspopup") || "").toLowerCase() === "menu"
    ) {
      score += 40;
    }
    if ((button?.id || "").startsWith("radix-")) {
      score += 20;
    }

    return { button, score, likelyFlowOptionsTrigger };
  }

  function getGenerationMenuTriggersByPriority() {
    const triggers = Array.from(
      document.querySelectorAll('button[aria-haspopup="menu"]'),
    ).filter(isVisible);
    return triggers
      .map((button) => getGenerationMenuTriggerMeta(button))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.button);
  }

  function isCompactFlowOptionsTrigger(button) {
    if (!button || !isVisible(button)) {
      return false;
    }

    const combined = getDeepNormalizedText(button);
    const hasVariant = /\bx[1-4]\b/.test(combined);
    const hasCrop =
      /(crop_9_16|crop_16_9|portrait|landscape|aspect_ratio|square)/.test(
        combined,
      );
    const hasModelLabel = /(nano|banana|imagen|veo|flux)/.test(combined);
    const popupVal = normalizeText(button.getAttribute("aria-haspopup") || "");
    const hasMenu =
      popupVal === "menu" || popupVal === "dialog" || popupVal === "true";

    // Relaxed check: Needs variant AND (crop OR model), plus proper popup attribute
    return hasMenu && hasVariant && (hasCrop || hasModelLabel);
  }

  function findCompactOptionsTriggerForSafeMode() {
    const strictByOverlay = Array.from(
      document.querySelectorAll('button[aria-haspopup="menu"]'),
    ).find(
      (button) =>
        button.querySelector('[data-type="button-overlay"]') &&
        isCompactFlowOptionsTrigger(button),
    );
    if (strictByOverlay) {
      return strictByOverlay;
    }

    const triggers = getGenerationMenuTriggersByPriority();
    if (triggers.length === 0) {
      return null;
    }

    const strict = triggers.find((button) => {
      return isCompactFlowOptionsTrigger(button);
    });

    if (strict) {
      return strict;
    }

    return (
      triggers.find(
        (button) =>
          getGenerationMenuTriggerMeta(button).likelyFlowOptionsTrigger,
      ) || null
    );
  }

  async function openGenerationMenuViaCompactTriggerSafeMode() {
    const existingMenu = getOpenGenerationMenu();
    if (existingMenu) {
      return { menu: existingMenu, trigger: null };
    }

    const trigger = findCompactOptionsTriggerForSafeMode();
    if (!trigger || !trigger.isConnected || !isVisible(trigger)) {
      return { menu: null, trigger: null };
    }

    console.log(
      "Safe mode clicking compact Flow options trigger:",
      trigger.id || normalizeText(trigger.textContent || "").slice(0, 120),
    );

    for (let pass = 0; pass < 3; pass++) {
      await clickElement(trigger);

      for (let attempt = 0; attempt < 12; attempt++) {
        await wait(140);
        const menu = getOpenGenerationMenu();
        if (menu) {
          return { menu, trigger };
        }
      }

      // Reset and retry if first click opened the wrong dropdown state.
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      await wait(140);
    }

    return { menu: null, trigger: null };
  }

  async function openGenerationMenuIfNeeded() {
    const existingMenu = getOpenGenerationMenu();
    if (existingMenu) {
      return { menu: existingMenu, trigger: null };
    }

    const triggers = getGenerationMenuTriggersByPriority();
    if (triggers.length === 0) {
      return { menu: null, trigger: null };
    }

    const preferred = triggers.filter(
      (button) => getGenerationMenuTriggerMeta(button).likelyFlowOptionsTrigger,
    );
    const orderedTriggers = preferred.concat(
      triggers.filter((button) => !preferred.includes(button)),
    );

    if (preferred.length > 0) {
      const preferredPreview = preferred[0];
      console.log(
        "Using Flow options trigger first:",
        preferredPreview.id ||
          normalizeText(preferredPreview.textContent || "").slice(0, 80),
      );
    }

    for (const trigger of orderedTriggers) {
      if (!trigger.isConnected || !isVisible(trigger)) {
        continue;
      }
      await clickElement(trigger);

      for (let attempt = 0; attempt < 10; attempt++) {
        await wait(160);
        const menu = getOpenGenerationMenu();
        if (menu) {
          const hasImageTab = !!findSafeModeTabButton(
            menu,
            "mediaType",
            "image",
          );
          const hasVideoTab = !!findSafeModeTabButton(
            menu,
            "mediaType",
            "video",
          );
          if (
            !hasImageTab &&
            !hasVideoTab &&
            !menu.querySelector('button[role="tab"]')
          ) {
            continue;
          }
          return { menu, trigger };
        }
      }

      // Close any non-generation dropdown opened by this trigger before trying next one.
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      await wait(120);
    }

    console.log(
      "Flow options menu did not open; falling back to visible page controls.",
    );
    return { menu: null, trigger: null };
  }

  function getCompactTriggerState() {
    const trigger = findGenerationMenuTrigger();
    if (!trigger) {
      return { mediaType: "", orientation: "", variantCount: "", model: "" };
    }

    const text = normalizeText(trigger.textContent || "");
    const iconText = Array.from(trigger.querySelectorAll("i"))
      .map((icon) => normalizeText(icon.textContent || ""))
      .join(" ");

    const combinedText = `${text} ${iconText}`;
    const variantMatch = combinedText.match(/\bx([1-4])\b/);

    let orientation = "";
    if (
      combinedText.includes("crop_9_16") ||
      combinedText.includes("portrait")
    ) {
      orientation = "portrait";
    } else if (
      combinedText.includes("crop_16_9") ||
      combinedText.includes("landscape")
    ) {
      orientation = "landscape";
    }

    let mediaType = "";
    if (/\bveo\b/.test(combinedText) || combinedText.includes("video")) {
      mediaType = "video";
    } else if (
      /(nano|banana|imagen)/.test(combinedText) ||
      combinedText.includes("image")
    ) {
      mediaType = "image";
    }

    return {
      mediaType,
      orientation,
      variantCount: variantMatch ? variantMatch[1] : "",
      model: text,
    };
  }

  function findModelTrigger(root = document) {
    const triggers = Array.from(
      root.querySelectorAll('button[aria-haspopup="menu"]'),
    ).filter(isVisible);
    return (
      triggers.find((button) =>
        /veo|banana|nano|imagen|quality|fast|priority|pro/i.test(
          normalizeText(button.textContent || ""),
        ),
      ) ||
      triggers[0] ||
      null
    );
  }

  function findVideoModelButton(modelName, root = document) {
    const menuItems = Array.from(
      root.querySelectorAll('div[role="menuitem"]'),
    ).filter(isVisible);
    const match = menuItems.find((item) => {
      const span = item.querySelector("span.sc-a0dcecfb-8");
      const icon = item.querySelector("i.google-symbols");
      return (
        span &&
        icon &&
        normalizeText(icon.textContent || "") === "volume_up" &&
        normalizeText(span.textContent || "") === normalizeText(modelName)
      );
    });

    return match?.querySelector("button") || null;
  }

  function findImageModelButton(modelName, root = document) {
    const wantedLabel = normalizeModelName(modelName);
    const exactButtons = Array.from(
      root.querySelectorAll(
        'button.sc-a0dcecfb-3.dPCJaL, div[role="menuitem"] button.sc-a0dcecfb-3.dPCJaL',
      ),
    ).filter(isVisible);

    const exactMatch = exactButtons.find((button) => {
      const span = button.querySelector("span.sc-a0dcecfb-8");
      const labelText = normalizeModelName(
        span?.textContent || button.textContent || "",
      );
      return labelText === wantedLabel || labelText.includes(wantedLabel);
    });

    if (exactMatch) {
      return exactMatch;
    }

    const menuItems = Array.from(
      root.querySelectorAll('div[role="menuitem"], button'),
    ).filter(isVisible);
    const match = menuItems.find((item) => {
      const span = item.querySelector("span.sc-a0dcecfb-8");
      const labelText = normalizeModelName(
        span?.textContent || item.textContent || "",
      );
      return labelText === wantedLabel || labelText.includes(wantedLabel);
    });

    if (!match) {
      return null;
    }

    return match.matches("button") ? match : match.querySelector("button");
  }

  async function openModelMenuIfNeeded() {
    const existingMenu = getOpenModelMenu();
    if (existingMenu) {
      return existingMenu;
    }

    const root = getOpenGenerationMenu() || document;
    const trigger = findModelTrigger(root);
    if (!trigger) {
      throw new Error("Model dropdown trigger not found.");
    }

    const currentLabel = normalizeText(trigger.textContent || "");
    const wantedLabel = normalizeText(config.generationOptions.model || "");
    if (wantedLabel && currentLabel.includes(wantedLabel)) {
      return null;
    }

    await clickElement(trigger);

    for (let attempt = 0; attempt < 10; attempt++) {
      await wait(200);
      const menu = getOpenModelMenu();
      if (menu) {
        return menu;
      }
    }

    if (findVisibleModelChoice(config.generationOptions.model)) {
      console.log("Model dropdown did not open; using visible model choices.");
      return document;
    }

    throw new Error("Model dropdown menu did not open.");
  }

  function findModelMenuButton(modelName) {
    const openMenu = getOpenModelMenu();
    return findVisibleModelChoice(modelName, openMenu || document);
  }

  function isCompactOptionSelected(optionName, optionValue) {
    if (getOpenGenerationMenu()) {
      return false;
    }

    const compactState = getCompactTriggerState();
    const wantedValue = normalizeText(String(optionValue));

    if (optionName === "variantCount") {
      return compactState.variantCount === String(optionValue);
    }

    if (optionName === "orientation") {
      return compactState.orientation === wantedValue;
    }

    if (optionName === "mediaType") {
      return compactState.mediaType === wantedValue;
    }

    return false;
  }

  async function ensureModelSelected() {
    if (!config.generationOptions.model) {
      return;
    }

    if (config.generationOptions.mediaType === "video") {
      await ensureVideoModelSelected(config.generationOptions.model);
      return;
    }

    await ensureImageModelSelected(config.generationOptions.model);
  }

  function getSafeModelForMediaType(mediaType, requestedModel) {
    const supportedModels = mediaType === "image" ? IMAGE_MODELS : VIDEO_MODELS;
    if (supportedModels.includes(requestedModel)) {
      return requestedModel;
    }

    const fallbackModel = supportedModels[0] || "";
    if (requestedModel) {
      console.warn(
        `Model "${requestedModel}" does not match mediaType "${mediaType}". Using "${fallbackModel}" instead.`,
      );
    }
    return fallbackModel;
  }

  function normalizeVideoModeOption(videoMode) {
    const normalized = normalizeText(videoMode || "");
    if (!normalized) {
      return "";
    }

    if (normalized.includes("frame")) {
      return "frames";
    }

    return "ingredients";
  }

  async function ensureImageModelSelected(modelName) {
    if (!IMAGE_MODELS.includes(modelName)) {
      throw new Error(`Invalid image model: "${modelName}"`);
    }

    const generationMenu = getOpenGenerationMenu();
    const trigger = findModelTrigger(generationMenu || document);
    if (trigger) {
      const currentLabel = normalizeModelName(trigger.textContent || "");
      const wantedLabel = normalizeModelName(modelName);
      if (currentLabel.includes(wantedLabel)) {
        console.log(`Flow image model already selected: ${modelName}`);
        return;
      }
    }

    const compactState = getCompactTriggerState();
    if (
      compactState.model &&
      normalizeModelName(compactState.model).includes(
        normalizeModelName(modelName),
      )
    ) {
      console.log(
        `Flow image model already selected in compact trigger: ${modelName}`,
      );
      return;
    }

    const modelMenu = await openModelMenuIfNeeded();
    if (!modelMenu) {
      return;
    }

    const button =
      findImageModelButton(modelName, modelMenu || document) ||
      findModelMenuButton(modelName);
    if (!button) {
      throw new Error(`Could not find model "${modelName}".`);
    }

    console.log(`Selecting Flow image model: ${modelName}`);
    await clickElement(button);
    await wait(400);
  }

  async function ensureVideoModelSelected(modelName) {
    if (!VIDEO_MODELS.includes(modelName)) {
      throw new Error(`Invalid video model: "${modelName}"`);
    }

    const wantedLabel = normalizeText(modelName);

    for (let attempt = 1; attempt <= 5; attempt++) {
      // retry up to 5 times
      try {
        // Open menu if not already open
        await openGenerationMenuIfNeeded();
        const modelMenu = await openModelMenuIfNeeded();

        // Try to find the model button
        const button =
          findVideoModelButton(modelName, modelMenu || document) ||
          findVisibleModelChoice(modelName, modelMenu || document);

        if (button) {
          console.log(
            `Selecting Flow video model: ${modelName} (attempt ${attempt})`,
          );
          await clickElement(button);
          await wait(400); // allow menu to settle
          return;
        }

        // Log all visible candidates for debugging
        const candidates = Array.from(
          document.querySelectorAll('div[role="menuitem"], button'),
        )
          .filter(isVisible)
          .map((el) => el.textContent.trim());
        console.warn(
          `Attempt ${attempt}: Model button not found. Visible candidates:`,
          candidates,
        );

        // Wait before retrying
        await wait(800);
      } catch (err) {
        console.warn(`Attempt ${attempt} failed to select video model:`, err);
        await wait(800); // wait a bit before retrying
      }
    }

    // If all attempts fail, throw error (will trigger autoRetry in main function)
    throw new Error(
      `Video model "${modelName}" could not be selected after multiple attempts.`,
    );
  }

  function getOptionSelectors(optionName, optionValue) {
    const upperValue = String(optionValue).toUpperCase();
    const variantLabel = `x${optionValue}`;

    const selectorMap = {
      mediaType: [
        `button[role="tab"][id*="-trigger-${upperValue}"]`,
        `button[role="tab"][aria-controls*="${upperValue}"]`,
      ],
      videoMode: [
        `button[role="tab"][id*="-trigger-${upperValue}"]`,
        `button[role="tab"][aria-controls*="${upperValue}"]`,
      ],
      orientation: [
        `button[role="tab"][id*="-trigger-${upperValue}"]`,
        `button[role="tab"][aria-controls*="${upperValue}"]`,
      ],
      variantCount: [
        `button[role="tab"][aria-controls][data-radix-collection-item]`,
        'button[role="tab"]',
      ],
    };

    if (optionName === "variantCount") {
      return {
        selectors: selectorMap[optionName],
        textMatcher: (text) => normalizeText(text) === variantLabel,
      };
    }

    return {
      selectors: selectorMap[optionName] || [],
      textMatcher: (text) =>
        normalizeText(text).includes(normalizeText(optionValue)),
    };
  }

  function findVariantButton(count, root = document) {
    const wantedValues = [String(count), `x${count}`].map((value) =>
      normalizeText(value),
    );
    const tabs = Array.from(
      root.querySelectorAll('button[role="tab"], button'),
    ).filter(isVisible);
    return (
      tabs.find((tab) =>
        wantedValues.includes(
          normalizeText(tab.textContent || tab.innerText || ""),
        ),
      ) || null
    );
  }

  function isOptionButtonActive(button) {
    if (!button) {
      return false;
    }

    return (
      button.getAttribute("aria-selected") === "true" ||
      button.getAttribute("data-state") === "active" ||
      button.getAttribute("aria-checked") === "true" ||
      button.getAttribute("aria-pressed") === "true"
    );
  }

  function findMediaTypeButton(optionValue, root = document) {
    const wantedValue = normalizeText(String(optionValue));
    const tabs = Array.from(
      root.querySelectorAll('button[role="tab"], button'),
    ).filter(isVisible);

    const strict = tabs.find(
      (button) =>
        normalizeText(button.textContent || button.innerText || "") ===
        wantedValue,
    );
    if (strict) {
      return strict;
    }

    const attrMatch = tabs.find((button) => {
      const id = normalizeText(button.getAttribute("id") || "");
      const controls = normalizeText(
        button.getAttribute("aria-controls") || "",
      );
      return id.includes(wantedValue) || controls.includes(wantedValue);
    });
    if (attrMatch) {
      return attrMatch;
    }

    return (
      tabs.find((button) =>
        normalizeText(button.textContent || button.innerText || "").includes(
          wantedValue,
        ),
      ) || null
    );
  }

  function getVideoModeTokens(optionValue) {
    const normalized = normalizeVideoModeOption(optionValue);
    if (normalized === "frames") {
      return {
        ids: ["VIDEO_FRAMES", "FRAMES"],
        labels: ["frames", "frame"],
      };
    }

    // Flow labels this mode as "Ingredients" but id token is often VIDEO_REFERENCES.
    return {
      ids: [
        "VIDEO_REFERENCES",
        "VIDEO_INGREDIENTS",
        "INGREDIENTS",
        "REFERENCES",
      ],
      labels: ["ingredients", "ingredient", "references", "reference"],
    };
  }

  function findVideoModeButton(optionValue, root = document) {
    const tabs = Array.from(root.querySelectorAll('button[role="tab"]')).filter(
      isVisible,
    );
    if (tabs.length === 0) {
      return null;
    }

    const tokens = getVideoModeTokens(optionValue);
    const idMatch = tabs.find((button) => {
      const id = button.getAttribute("id") || "";
      const controls = button.getAttribute("aria-controls") || "";
      return tokens.ids.some(
        (token) => id.includes(token) || controls.includes(token),
      );
    });
    if (idMatch) {
      return idMatch;
    }

    const textMatch = tabs.find((button) => {
      const text = normalizeText(button.textContent || button.innerText || "");
      return tokens.labels.some(
        (label) => text === label || text.includes(label),
      );
    });
    if (textMatch) {
      return textMatch;
    }

    return null;
  }

  function findOptionButton(optionName, optionValue) {
    const root = getOpenGenerationMenu() || document;

    if (optionName === "mediaType") {
      return findMediaTypeButton(optionValue, root);
    }

    if (optionName === "videoMode") {
      return findVideoModeButton(optionValue, root);
    }

    if (optionName === "variantCount") {
      return findVariantButton(optionValue, root);
    }

    const { selectors, textMatcher } = getOptionSelectors(
      optionName,
      optionValue,
    );

    for (const selector of selectors) {
      const candidates = Array.from(root.querySelectorAll(selector)).filter(
        isVisible,
      );
      const match = candidates.find((button) =>
        textMatcher(button.textContent || button.innerText || ""),
      );
      if (match) {
        return match;
      }

      if (
        candidates.length === 1 &&
        optionName !== "variantCount" &&
        optionName !== "mediaType"
      ) {
        return candidates[0];
      }
    }

    const fallbackCandidates = Array.from(
      root.querySelectorAll('button[role="tab"], button'),
    ).filter(isVisible);
    return (
      fallbackCandidates.find((button) =>
        textMatcher(button.textContent || button.innerText || ""),
      ) || null
    );
  }

  async function ensureOptionSelected(optionName, optionValue) {
    if (isCompactOptionSelected(optionName, optionValue)) {
      console.log(
        `Flow compact option already selected: ${optionName}=${optionValue}`,
      );
      return;
    }

    const button = findOptionButton(optionName, optionValue);
    if (!button) {
      throw new Error(
        `Could not find Flow option "${optionValue}" for ${optionName}.`,
      );
    }

    const isActive = isOptionButtonActive(button);

    if (isActive) {
      console.log(`Flow option already selected: ${optionName}=${optionValue}`);
      return;
    }

    console.log(`Selecting Flow option: ${optionName}=${optionValue}`);
    await clickElement(button);
    await wait(350);

    if (optionName === "mediaType") {
      const recheckButton = findMediaTypeButton(
        optionValue,
        getOpenGenerationMenu() || document,
      );
      if (!isOptionButtonActive(recheckButton)) {
        throw new Error(
          `Failed to switch Flow media type to "${optionValue}".`,
        );
      }
    }

    if (optionName === "videoMode") {
      const recheckButton = findVideoModeButton(
        optionValue,
        getOpenGenerationMenu() || document,
      );
      if (!isOptionButtonActive(recheckButton)) {
        throw new Error(
          `Failed to switch Flow video mode to "${optionValue}".`,
        );
      }
    }
  }

  async function applyImageGenerationOptions() {
    if (config.generationOptions.orientation) {
      await ensureOptionSelected(
        "orientation",
        config.generationOptions.orientation,
      );
    }

    if (config.generationOptions.variantCount) {
      await ensureOptionSelected(
        "variantCount",
        config.generationOptions.variantCount,
      );
    }

    const imageModel = getSafeModelForMediaType(
      "image",
      config.generationOptions.model,
    );
    if (imageModel) {
      await ensureImageModelSelected(imageModel);
    }
  }

  async function applyVideoGenerationOptions() {
    const videoMode = normalizeVideoModeOption(
      config.generationOptions.videoMode,
    );
    if (videoMode) {
      await ensureOptionSelected("videoMode", videoMode);
    }

    if (config.generationOptions.orientation) {
      await ensureOptionSelected(
        "orientation",
        config.generationOptions.orientation,
      );
    }

    if (config.generationOptions.variantCount) {
      await ensureOptionSelected(
        "variantCount",
        config.generationOptions.variantCount,
      );
    }

    const videoModel = getSafeModelForMediaType(
      "video",
      config.generationOptions.model,
    );
    if (videoModel) {
      await ensureVideoModelSelected(videoModel);
    }
  }

  async function applyGenerationOptions() {
    const menuState = await openGenerationMenuIfNeeded();
    const mediaType =
      normalizeText(config.generationOptions.mediaType) === "image"
        ? "image"
        : "video";
    config.generationOptions.mediaType = mediaType;

    // Always set Image/Video first so later controls map to the correct UI group.
    await ensureOptionSelected("mediaType", mediaType);
    await wait(200);

    if (mediaType === "image") {
      await applyImageGenerationOptions();
    } else {
      await applyVideoGenerationOptions();
    }

    const openMenu = getOpenGenerationMenu();
    if (openMenu) {
      if (menuState.trigger && isVisible(menuState.trigger)) {
        await clickElement(menuState.trigger);
      } else {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      }
      await wait(250);
    }
  }

  async function waitForOptionControlsToSettle(timeout = 3000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (!getOpenGenerationMenu() && !getOpenModelMenu()) {
        await wait(200);
        return;
      }

      await wait(100);
    }

    console.log(
      "Flow option controls did not fully close before prompt entry, continuing.",
    );
  }

  function findCreateButton() {
    const composerSend = findComposerSubmitButton(null);
    if (composerSend && !composerSend.disabled) {
      return composerSend;
    }

    const exactSelectors = [
      "button.sc-45319f81-4.cNTGRJ",
      "button.sc-e8425ea6-0.sc-d3791a4f-0.sc-d3791a4f-4.sc-45319f81-4.ewQKQI.eaSocK.cNTGRJ",
    ];

    for (const selector of exactSelectors) {
      const exactButton = document.querySelector(selector);
      if (exactButton && isVisible(exactButton) && !exactButton.disabled) {
        console.log(
          "Found exact Flow Create button using class selector:",
          selector,
        );
        return exactButton;
      }
    }

    const buttons = Array.from(document.querySelectorAll("button")).filter(
      isVisible,
    );
    const createLikeButtons = [];

    for (const button of buttons) {
      if (
        button.disabled ||
        button.hasAttribute("disabled") ||
        button.getAttribute("aria-disabled") === "true"
      ) {
        continue;
      }

      const buttonText = normalizeText(button.textContent || "");
      const spanText = Array.from(button.querySelectorAll("span"))
        .map((span) => normalizeText(span.textContent || ""))
        .join(" ");
      const iconText = Array.from(button.querySelectorAll("i"))
        .map((icon) => normalizeText(icon.textContent || ""))
        .join(" ");
      const ariaHasPopup = button.getAttribute("aria-haspopup") || "";

      if (ariaHasPopup === "dialog") {
        continue;
      }

      const hasCreateText =
        buttonText.includes("create") ||
        spanText.includes("create") ||
        buttonText.includes("generate") ||
        spanText.includes("generate");
      const hasForwardIcon = iconText.includes("arrow_forward");

      if (hasForwardIcon && hasCreateText) {
        return button;
      }

      if (hasCreateText || hasForwardIcon) {
        createLikeButtons.push(button);
      }
    }

    if (createLikeButtons.length > 0) {
      return createLikeButtons[createLikeButtons.length - 1];
    }

    return null;
  }

  async function findCreateButtonWithRetry(maxAttempts = 20, waitMs = 150) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const button = findCreateButton();
      if (button) {
        return button;
      }
      await wait(waitMs);
    }

    return null;
  }

  function findVisibleFlowMessage() {
    const candidates = Array.from(
      document.querySelectorAll(
        '[role="alert"], [aria-live="assertive"], [aria-live="polite"], [data-sonner-toast], [data-toast], .toast, .Toast, .Toastify__toast',
      ),
    ).filter(isVisible);

    for (const element of candidates) {
      const text = (element.textContent || "").replace(/\s+/g, " ").trim();
      if (text.length >= 3 && text.length <= 240) {
        return text;
      }
    }

    return "";
  }

  function getButtonSemanticText(button) {
    const iconText = Array.from(button.querySelectorAll("i"))
      .map((icon) => normalizeText(icon.textContent || ""))
      .join(" ");
    const parts = [
      button.textContent || "",
      button.getAttribute("aria-label") || "",
      button.getAttribute("title") || "",
      button.getAttribute("data-testid") || "",
      iconText,
    ];
    return normalizeText(parts.join(" "));
  }

  function scoreComposerSubmitButton(button, promptInput = null) {
    if (!button || !isVisible(button)) {
      return -9999;
    }

    if (
      button.closest(
        '[role="menu"], [role="dialog"], [aria-modal="true"], [data-radix-menu-content]',
      )
    ) {
      return -9999;
    }

    const semantic = getButtonSemanticText(button);
    const hasPopup = normalizeText(button.getAttribute("aria-haspopup") || "");
    const rect = button.getBoundingClientRect();
    let score = 0;

    if (
      /arrow_forward|arrow_right_alt|send|submit|create|generate/.test(semantic)
    ) {
      score += 260;
    }
    if (
      /x1|x2|x3|x4|crop_9_16|crop_16_9|nano banana|imagen|veo/.test(semantic)
    ) {
      score -= 240;
    }
    if (hasPopup === "menu" || hasPopup === "dialog") {
      score -= 200;
    }

    // Primary Flow send button is usually circular and at lower-right of composer.
    if (rect.width <= 56 && rect.height <= 56) {
      score += 40;
    }
    if (rect.bottom >= window.innerHeight * 0.66) {
      score += 60;
    }

    if (promptInput && promptInput.isConnected) {
      const inputRect = promptInput.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const inputCenterX = inputRect.left + inputRect.width / 2;
      const inputCenterY = inputRect.top + inputRect.height / 2;
      const distance = Math.hypot(
        centerX - inputCenterX,
        centerY - inputCenterY,
      );
      score += Math.max(0, 220 - distance / 5);

      if (
        rect.left >= inputRect.right - 120 &&
        Math.abs(centerY - inputCenterY) < 120
      ) {
        score += 120;
      }
    }

    return score;
  }

  function findComposerSubmitButton(promptInput = null) {
    const buttons = Array.from(document.querySelectorAll("button")).filter(
      isVisible,
    );
    let best = null;
    let bestScore = -9999;

    for (const button of buttons) {
      const score = scoreComposerSubmitButton(button, promptInput);
      if (score > bestScore) {
        best = button;
        bestScore = score;
      }
    }

    return bestScore >= 120 ? best : null;
  }

  function isFlowClientErrorPage() {
    const title = normalizeText(document.title || "");
    if (title.includes("application error")) {
      return true;
    }

    const bodyText = normalizeText(document.body?.innerText || "");
    return bodyText.includes("application error: a client-side");
  }

  function isTabButtonActive(button) {
    return (
      button?.getAttribute("aria-selected") === "true" ||
      button?.getAttribute("data-state") === "active"
    );
  }

  function findSafeModeTabButton(menu, optionName, optionValue) {
    if (!menu) {
      return null;
    }

    const wanted = normalizeText(String(optionValue || ""));
    const upper = String(optionValue || "").toUpperCase();
    const tabs = Array.from(
      menu.querySelectorAll(
        'button.flow_tab_slider_trigger[role="tab"], button[role="tab"]',
      ),
    ).filter(isVisible);
    if (tabs.length === 0) {
      return null;
    }

    if (optionName === "mediaType") {
      return (
        tabs.find((button) =>
          (button.getAttribute("id") || "").includes(`-trigger-${upper}`),
        ) ||
        tabs.find((button) =>
          normalizeText(button.textContent || "").includes(wanted),
        ) ||
        null
      );
    }

    if (optionName === "orientation") {
      return (
        tabs.find((button) =>
          (button.getAttribute("id") || "").includes(`-trigger-${upper}`),
        ) ||
        tabs.find((button) =>
          normalizeText(button.textContent || "").includes(wanted),
        ) ||
        null
      );
    }

    if (optionName === "videoMode") {
      const tokens = getVideoModeTokens(optionValue);
      return (
        tabs.find((button) => {
          const id = button.getAttribute("id") || "";
          const controls = button.getAttribute("aria-controls") || "";
          return tokens.ids.some(
            (token) => id.includes(token) || controls.includes(token),
          );
        }) ||
        tabs.find((button) => {
          const text = normalizeText(button.textContent || "");
          return tokens.labels.some(
            (label) => text === label || text.includes(label),
          );
        }) ||
        null
      );
    }

    if (optionName === "variantCount") {
      const count = String(optionValue || "");
      return (
        tabs.find((button) =>
          (button.getAttribute("id") || "").includes(`-trigger-${count}`),
        ) ||
        tabs.find(
          (button) => normalizeText(button.textContent || "") === `x${count}`,
        ) ||
        tabs.find(
          (button) => normalizeText(button.textContent || "") === count,
        ) ||
        null
      );
    }

    return null;
  }

  async function ensureSafeModeTabSelected(menu, optionName, optionValue) {
    const button = findSafeModeTabButton(menu, optionName, optionValue);
    if (!button) {
      throw new Error(`Safe mode could not find ${optionName}=${optionValue}`);
    }
    if (!isTabButtonActive(button)) {
      await clickElement(button);
      await wait(200);
    }
  }

  async function ensureSafeModeModelSelected(menu, modelName) {
    const desired = normalizeModelName(modelName || "");
    if (!desired) {
      return;
    }

    const modelTrigger = menu?.querySelector('button[aria-haspopup="menu"]');
    if (!modelTrigger || !isVisible(modelTrigger)) {
      return;
    }

    const current = normalizeModelName(modelTrigger.textContent || "");
    if (current.includes(desired)) {
      return;
    }

    await clickElement(modelTrigger);
    await wait(220);

    const modelMenu = getOpenModelMenu();
    const modelButtons = Array.from(
      (modelMenu || document).querySelectorAll(
        'div[role="menuitem"] button, button.sc-a0dcecfb-3.dPCJaL',
      ),
    ).filter(isVisible);
    const match = modelButtons.find((button) =>
      normalizeModelName(button.textContent || "").includes(desired),
    );

    if (!match) {
      throw new Error(`Safe mode could not find model "${modelName}"`);
    }

    await clickElement(match);
    await wait(220);
  }

  async function applyGenerationOptionsSafeMode() {
    // Explicitly click the compact model/crop/xN trigger first in safe mode.
    let menuState = await openGenerationMenuViaCompactTriggerSafeMode();
    if (menuState.trigger && !menuState.menu) {
      throw new Error(
        "Safe mode clicked compact options trigger, but options menu did not open.",
      );
    }
    if (!menuState.menu) {
      const openMenuFn =
        typeof openGenerationMenuIfNeeded === "function"
          ? openGenerationMenuIfNeeded
          : null;
      if (openMenuFn) {
        menuState = await openMenuFn();
      } else {
        console.warn(
          "openGenerationMenuIfNeeded is unavailable; skipping safe menu open.",
        );
      }
    }
    const menu = getOpenGenerationMenu();
    if (!menu) {
      // Fallback to generic option selection when menu root cannot be detected.
      await applyGenerationOptions();
      return;
    }

    const mediaType =
      normalizeText(config.generationOptions.mediaType) === "image"
        ? "image"
        : "video";
    config.generationOptions.mediaType = mediaType;

    await ensureSafeModeTabSelected(menu, "mediaType", mediaType);

    if (mediaType === "video" && config.generationOptions.videoMode) {
      await ensureSafeModeTabSelected(
        menu,
        "videoMode",
        normalizeVideoModeOption(config.generationOptions.videoMode),
      );
    }

    if (config.generationOptions.orientation) {
      await ensureSafeModeTabSelected(
        menu,
        "orientation",
        config.generationOptions.orientation,
      );
    }

    if (config.generationOptions.variantCount) {
      await ensureSafeModeTabSelected(
        menu,
        "variantCount",
        config.generationOptions.variantCount,
      );
    }

    const modelName = getSafeModelForMediaType(
      mediaType,
      config.generationOptions.model,
    );
    if (modelName) {
      await ensureSafeModeModelSelected(menu, modelName);
    }

    const openMenu = getOpenGenerationMenu();
    if (openMenu) {
      if (menuState.trigger && isVisible(menuState.trigger)) {
        await clickElement(menuState.trigger);
      } else {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        await wait(120);
      }
    }
  }

  async function setPromptTextMinimal(element, prompt) {
    const promptText = String(prompt ?? "");
    element.focus();
    await wait(80);

    if (isContentEditableElement(element)) {
      selectElementContents(element);
      await wait(40);

      let inserted = false;
      try {
        inserted = document.execCommand("insertText", false, promptText);
      } catch (error) {
        inserted = false;
      }

      if (!inserted) {
        setNativeValue(element, promptText);
      }
      dispatchEditableEvents(element, promptText);
    } else {
      setNativeValue(element, promptText);
      dispatchEditableEvents(element, promptText);
    }

    await wait(180);
  }

  async function startGenerationPromptOnly(prompt) {
    if (isFlowClientErrorPage()) {
      return {
        success: false,
        error:
          "Flow page is in Application error state. Refresh the tab first.",
      };
    }

    await nudgeFlowPageFocus();

    // Notification
    chrome.runtime.sendMessage({
      action: "updateStatus",
      message: "✓ Entering prompt directly (no click needed)...",
      type: "info",
    });

    // In safe mode, use strict menu selectors that match Flow tab/menu structure.
    await applyGenerationOptionsSafeMode();
    await waitForOptionControlsToSettle();

    chrome.runtime.sendMessage({
      action: "updateStatus",
      message: "Entering prompt (safe mode)...",
      type: "info",
    });

    const promptInput = await waitForPromptInput(12000);
    await ensurePromptCommitted(promptInput, prompt, 6);
    await verifyPromptBeforeSubmit(promptInput, prompt);

    const generateButton =
      findComposerSubmitButton(promptInput) ||
      (await findCreateButtonWithRetry(8, 150));
    await submitPromptLikeUser(promptInput, generateButton, prompt);

    const submitResult = await waitForGenerationStart(
      promptInput,
      generateButton,
      prompt,
    );
    if (!submitResult.success) {
      return {
        success: false,
        error:
          submitResult.error || "Flow did not start generation after submit.",
      };
    }

    if (config.notifyComplete || config.reloadAfterComplete) {
      monitorGeneration();
    }

    return { success: true };
  }

  function hasGenerationStarted() {
    const loadingIndicators = [
      '[role="progressbar"]',
      ".loading",
      ".spinner",
      '[aria-busy="true"]',
      '[data-state="loading"]',
      ".progress",
    ];

    if (
      loadingIndicators.some((selector) => document.querySelector(selector))
    ) {
      return true;
    }

    const percentNodes = Array.from(
      document.querySelectorAll("span, div"),
    ).filter(isVisible);
    if (
      percentNodes.some((node) =>
        /\b([1-9]?\d|100)%\b/.test(normalizeText(node.textContent || "")),
      )
    ) {
      return true;
    }

    const createButton = findCreateButton();
    if (
      createButton &&
      (createButton.disabled ||
        createButton.hasAttribute("disabled") ||
        createButton.getAttribute("aria-disabled") === "true")
    ) {
      return true;
    }

    const statusTexts = [
      "generating",
      "creating",
      "queued",
      "processing",
      "loading",
      "starting",
      "preparing",
      "rendering",
    ];
    const visibleNodes = Array.from(
      document.querySelectorAll("button, span, div"),
    ).filter(isVisible);
    return visibleNodes.some((node) => {
      const text = normalizeText(node.textContent || "");
      return statusTexts.some((keyword) => text.includes(keyword));
    });
  }

  async function submitPromptLikeUser(
    promptInput,
    submitButton = null,
    expectedPrompt = "",
  ) {
    if (!promptInput) {
      throw new Error("Prompt input is required for submit.");
    }

    // Ensure prompt is in the textbox
    if (expectedPrompt) {
      await ensurePromptCommitted(promptInput, expectedPrompt, 2);
    }

    // Focus and submit via Enter key
    promptInput.focus();
    moveCaretToEnd(promptInput);
    await wait(60);

    const keyInit = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    };

    promptInput.dispatchEvent(new KeyboardEvent("keydown", keyInit));
    promptInput.dispatchEvent(new KeyboardEvent("keypress", keyInit));
    promptInput.dispatchEvent(new KeyboardEvent("keyup", keyInit));
    await wait(750);

    // If Enter didn't work, click the submit button
    if (!hasGenerationStarted()) {
      const button =
        submitButton ||
        findComposerSubmitButton(promptInput) ||
        findCreateButton();
      if (button && isVisible(button) && !button.disabled) {
        await clickElement(button);
        await wait(750);
      }
    }
  }

  async function waitForGenerationStart(
    promptInput,
    submitButton,
    expectedPrompt = "",
    timeout = 30000,
  ) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (!isProjectPage()) {
        throw new Error(
          "Flow navigated away from the project page during submit.",
        );
      }

      // Check if generation has started
      if (hasGenerationStarted()) {
        console.log("[waitForGenerationStart] ✓ Generation started");
        return { success: true };
      }

      // Check for critical errors (but IGNORE "Prompt must be provided")
      const flowMessage = findVisibleFlowMessage();
      if (
        flowMessage &&
        !/prompt.*must be provided|must be provided.*prompt/i.test(
          flowMessage,
        ) &&
        /(error|failed|credits|limit|denied)/i.test(flowMessage)
      ) {
        console.warn("[waitForGenerationStart] Critical error:", flowMessage);
        return { success: false, error: flowMessage };
      }

      await wait(250);
    }

    return {
      success: false,
      error: "Flow did not start generation after submit.",
    };
  }

  async function verifyPromptBeforeSubmit(promptInput, expectedPrompt) {
    const actualValue = getEditableValue(promptInput);
    const normalizedActual = normalizeText(actualValue);
    const normalizedExpected = normalizeText(expectedPrompt);

    console.log("Pre-submit verification:", {
      expected: normalizedExpected,
      actual: normalizedActual,
      match: normalizedActual === normalizedExpected,
    });

    if (normalizedActual !== normalizedExpected) {
      console.warn(
        "Pre-submit check failed. Attempting framework sync recovery.",
      );
      await triggerFrameworkSync(promptInput, expectedPrompt);
      await wait(800);

      const retryValue = getEditableValue(promptInput);
      if (normalizeText(retryValue) !== normalizedExpected) {
        throw new Error(
          `Pre-submit verification failed. Expected: "${expectedPrompt}", Got: "${retryValue}"`,
        );
      }
    }

    return true;
  }

  // Process multiple prompts in queue
  async function processPromptQueue(prompts, delayBetween = 10000) {
    console.log(`🎬 Starting queue processing: ${prompts.length} prompts`);
    console.log(`⏱️ Delay between prompts: ${delayBetween}ms`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      const current = i + 1;
      const total = prompts.length;

      console.log(`\n${"=".repeat(50)}`);
      console.log(`📋 Queue Progress: ${current}/${total}`);
      console.log(`📝 Prompt: "${prompt}"`);
      console.log(`${"=".repeat(50)}\n`);

      // Send progress update to popup
      chrome.runtime.sendMessage({
        action: "queueProgress",
        current: current,
        total: total,
        message: `Processing: "${prompt.substring(0, 40)}${prompt.length > 40 ? "..." : ""}"`,
      });

      try {
        // Generate video for this prompt
        const result = await startVideoGeneration(prompt, 0);

        if (result.success) {
          successCount++;
          results.push({ prompt, success: true });
          console.log(`✅ [${current}/${total}] Success: "${prompt}"`);

          chrome.runtime.sendMessage({
            action: "queueProgress",
            current: current,
            total: total,
            message: `✅ Completed: "${prompt.substring(0, 30)}..."`,
            type: "success",
          });
        } else {
          failCount++;
          results.push({ prompt, success: false, error: result.error });
          console.log(`❌ [${current}/${total}] Failed: "${prompt}"`);

          chrome.runtime.sendMessage({
            action: "queueProgress",
            current: current,
            total: total,
            message: `❌ Failed: "${prompt.substring(0, 30)}..."`,
            type: "error",
          });
        }
      } catch (error) {
        failCount++;
        results.push({ prompt, success: false, error: error.message });
        console.error(`❌ [${current}/${total}] Error:`, error);

        chrome.runtime.sendMessage({
          action: "queueProgress",
          current: current,
          total: total,
          message: `❌ Error: ${error.message}`,
          type: "error",
        });
      }

      // Wait before next prompt (except for last one)
      if (i < prompts.length - 1) {
        const waitSeconds = Math.ceil(delayBetween / 1000);
        console.log(`⏳ Waiting ${waitSeconds}s before next prompt...`);

        chrome.runtime.sendMessage({
          action: "queueProgress",
          current: current,
          total: total,
          message: `⏳ Waiting ${waitSeconds}s before next...`,
          type: "info",
        });

        await new Promise((resolve) => setTimeout(resolve, delayBetween));
      }
    }

    // Final summary
    console.log(`\n${"=".repeat(50)}`);
    console.log(`🎉 Queue Complete!`);
    console.log(`✅ Success: ${successCount}/${prompts.length}`);
    console.log(`❌ Failed: ${failCount}/${prompts.length}`);
    console.log(`${"=".repeat(50)}\n`);

    // Send final notification
    chrome.runtime.sendMessage({
      action: "updateStatus",
      message: `🎉 Queue complete! ✅ ${successCount} success, ❌ ${failCount} failed`,
      type: successCount === prompts.length ? "success" : "warning",
    });

    // Browser notification
    if (config.notifyComplete && Notification.permission === "granted") {
      new Notification("Queue Complete! 🎉", {
        body: `Processed ${prompts.length} prompts\n✅ ${successCount} success, ❌ ${failCount} failed`,
        icon: "icon48.png",
      });
    }

    return {
      success: true,
      results: results,
      successCount: successCount,
      failCount: failCount,
      total: prompts.length,
    };
  }

  function loadQueueStateV2() {
    try {
      const sessionRaw = sessionStorage.getItem(QUEUE_STATE_KEY);
      if (sessionRaw) {
        return JSON.parse(sessionRaw);
      }

      const localRaw = localStorage.getItem(QUEUE_STATE_KEY);
      if (localRaw) {
        return JSON.parse(localRaw);
      }

      return null;
    } catch (error) {
      console.warn("Failed to load queue state:", error);
      return null;
    }
  }

  function saveQueueStateV2(state) {
    try {
      sessionStorage.setItem(QUEUE_STATE_KEY, JSON.stringify(state));
      localStorage.setItem(QUEUE_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Failed to save queue state:", error);
    }
  }

  function clearQueueStateV2() {
    try {
      sessionStorage.removeItem(QUEUE_STATE_KEY);
      localStorage.removeItem(QUEUE_STATE_KEY);
    } catch (error) {
      console.warn("Failed to clear queue state:", error);
    }
  }

  function sendQueueProgressV2(message, current, total, type = "info") {
    chrome.runtime.sendMessage({
      action: "queueProgress",
      current,
      total,
      message,
      type,
    });
  }

  function applyQueueConfigV2(queueState) {
    if (!queueState || typeof queueState !== "object") {
      return;
    }

    if (typeof queueState.autoRetry === "boolean") {
      config.autoRetry = queueState.autoRetry;
    }
    if (typeof queueState.notifyComplete === "boolean") {
      config.notifyComplete = queueState.notifyComplete;
    }
    // Disable auto-reload behavior to keep Flow stable on the same page.
    config.reloadAfterComplete = false;
    if (
      queueState.generationOptions &&
      typeof queueState.generationOptions === "object"
    ) {
      config.generationOptions = {
        ...config.generationOptions,
        ...queueState.generationOptions,
      };
    }
  }

  async function waitForGenerationCompletionV2(
    timeoutMs = 900000,
    startTimeoutMs = 120000,
  ) {
    const beginAt = Date.now();
    let sawActive = false;
    let inactiveSince = 0;

    while (Date.now() - beginAt < timeoutMs) {
      if (stopRequested) {
        return { success: false, stopped: true, error: STOPPED_ERROR_MESSAGE };
      }

      const active = hasGenerationStarted();
      if (active) {
        sawActive = true;
        inactiveSince = 0;
      } else if (sawActive) {
        if (!inactiveSince) {
          inactiveSince = Date.now();
        }

        // Require a stable idle window and minimum elapsed time to avoid
        // queueing the next prompt while Flow is still processing in background.
        const idleFor = Date.now() - inactiveSince;
        const waitedFor = Date.now() - beginAt;
        if (
          idleFor >= QUEUE_COMPLETION_IDLE_MS &&
          waitedFor >= QUEUE_COMPLETION_MIN_WAIT_MS
        ) {
          return { success: true };
        }
      } else if (Date.now() - beginAt > startTimeoutMs) {
        return {
          success: false,
          error: "Generation never entered active state.",
        };
      }

      await wait(QUEUE_COMPLETION_POLL_MS);
    }

    return {
      success: false,
      error: "Timed out waiting for generation to complete.",
    };
  }

  async function runQueueStateMachineV2(queueState) {
    if (queueRunInProgress) {
      return;
    }
    queueRunInProgress = true;

    try {
      if (stopRequested) {
        stopAutomation(STOPPED_ERROR_MESSAGE, true);
        return;
      }

      applyQueueConfigV2(queueState);

      const total = queueState.prompts.length;
      const startIndex = Number(queueState.currentIndex) || 0;

      for (let index = startIndex; index < total; index++) {
        if (stopRequested) {
          stopAutomation(STOPPED_ERROR_MESSAGE, true);
          return;
        }

        const prompt = queueState.prompts[index];
        const current = index + 1;

        sendQueueProgressV2(
          `Processing: "${prompt.substring(0, 40)}${prompt.length > 40 ? "..." : ""}"`,
          current,
          total,
          "info",
        );

        let result;
        try {
          result = await startVideoGeneration(prompt, 0);
        } catch (error) {
          result = { success: false, error: error.message };
        }

        if (result?.stopped || isStopError(result?.error)) {
          stopAutomation(STOPPED_ERROR_MESSAGE, true);
          return;
        }

        if (result.success) {
          const completion = await waitForGenerationCompletionV2();
          if (completion?.stopped || isStopError(completion?.error)) {
            stopAutomation(STOPPED_ERROR_MESSAGE, true);
            return;
          }

          if (completion.success) {
            queueState.successCount += 1;
            queueState.results.push({ prompt, success: true });
            sendQueueProgressV2(
              `Completed: "${prompt.substring(0, 30)}${prompt.length > 30 ? "..." : ""}"`,
              current,
              total,
              "success",
            );
          } else {
            queueState.failCount += 1;
            queueState.results.push({
              prompt,
              success: false,
              error: completion.error,
            });
            sendQueueProgressV2(
              `Failed: "${prompt.substring(0, 30)}..." (${completion.error})`,
              current,
              total,
              "error",
            );
          }
        } else {
          queueState.failCount += 1;
          queueState.results.push({
            prompt,
            success: false,
            error: result.error,
          });
          sendQueueProgressV2(
            `Failed: "${prompt.substring(0, 30)}..."`,
            current,
            total,
            "error",
          );
        }

        queueState.currentIndex = current;
        saveQueueStateV2(queueState);

        if (current < total) {
          const waitSeconds = Math.ceil(queueState.delayBetween / 1000);
          sendQueueProgressV2(
            `Waiting ${waitSeconds}s before next prompt...`,
            current,
            total,
            "info",
          );
          await wait(queueState.delayBetween);
        }
      }

      chrome.runtime.sendMessage({
        action: "updateStatus",
        message: `Queue complete! ${queueState.successCount} success, ${queueState.failCount} failed`,
        type: queueState.failCount === 0 ? "success" : "warning",
      });

      if (config.notifyComplete && Notification.permission === "granted") {
        new Notification("Queue Complete!", {
          body: `Processed ${queueState.prompts.length} prompts\n${queueState.successCount} success, ${queueState.failCount} failed`,
          icon: "icon48.png",
        });
      }

      clearQueueStateV2();
    } catch (error) {
      if (isStopError(error)) {
        stopAutomation(STOPPED_ERROR_MESSAGE, true);
        return;
      }
      throw error;
    } finally {
      queueRunInProgress = false;
    }
  }

  function buildQueueStateV2(prompts, delayBetween) {
    return {
      queueId: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      prompts,
      delayBetween,
      currentIndex: 0,
      successCount: 0,
      failCount: 0,
      results: [],
      refreshBetweenPrompts: false,
      projectPath: window.location.pathname,
      autoRetry: config.autoRetry,
      notifyComplete: config.notifyComplete,
      reloadAfterComplete: false,
      generationOptions: { ...config.generationOptions },
    };
  }

  // Queue mode runs sequentially on the same page (no forced refresh).
  async function processPromptQueue(prompts, delayBetween = 10000) {
    stopRequested = false;

    const normalizedPrompts = (prompts || [])
      .map((prompt) => String(prompt || "").trim())
      .filter(Boolean);

    if (normalizedPrompts.length === 0) {
      return { success: false, error: "No prompts provided for queue mode." };
    }

    const queueState = buildQueueStateV2(
      normalizedPrompts,
      Math.max(1000, Number(delayBetween) || 10000),
    );
    saveQueueStateV2(queueState);
    void runQueueStateMachineV2(queueState);

    return {
      success: true,
      message: `Queue started for ${normalizedPrompts.length} prompt(s). Running sequentially without page refresh.`,
      queued: true,
    };
  }

  function resumeQueueAfterReloadIfNeededV2() {
    const queueState = loadQueueStateV2();
    if (!queueState) {
      return;
    }

    if (!isProjectPage()) {
      return;
    }

    if (
      queueState.projectPath &&
      queueState.projectPath !== window.location.pathname
    ) {
      return;
    }

    sendQueueProgressV2(
      `Resuming queue at item ${(Number(queueState.currentIndex) || 0) + 1}/${queueState.prompts.length}...`,
      (Number(queueState.currentIndex) || 0) + 1,
      queueState.prompts.length,
      "info",
    );

    window.setTimeout(() => {
      void runQueueStateMachineV2(queueState);
    }, 1800);
  }

  // Main generation function
  async function startVideoGeneration(prompt, retryCount = 0) {
    try {
      throwIfStopRequested();

      console.log("Starting video generation with prompt:", prompt);
      console.log("Generation options:", config.generationOptions);

      if (!isProjectPage()) {
        throw new Error(
          "Open a Google Flow project page first. The extension will not run on the Flow home page.",
        );
      }

      await nudgeFlowPageFocus();

      if (config.skipStyleAutomation) {
        return startGenerationPromptOnly(prompt);
      }

      chrome.runtime.sendMessage({
        action: "updateStatus",
        message: "Applying style options first...",
        type: "info",
      });
      await applyGenerationOptions();
      await waitForOptionControlsToSettle();

      console.log("Looking for the real Flow Create button...");
      const generateButton = await findCreateButtonWithRetry(20, 150);

      if (!generateButton) {
        throw new Error("Submit button not found.");
      }

      // Prefer prompt fields closest to Create button.
      const promptCandidates = findPromptInputCandidates(generateButton, 6);
      if (promptCandidates.length === 0) {
        throw new Error("No prompt input field found on page.");
      }

      chrome.runtime.sendMessage({
        action: "updateStatus",
        message: "Entering prompt after styles are set...",
        type: "info",
      });

      console.log(
        `Found ${promptCandidates.length} prompt field candidate(s).`,
      );
      let promptInput = null;

      for (let index = 0; index < promptCandidates.length; index++) {
        const candidate = promptCandidates[index];
        console.log(`Trying candidate ${index + 1}/${promptCandidates.length}`);

        try {
          await ensurePromptCommitted(candidate, prompt, 6);
          await wait(1500);

          if (await validatePromptInField(candidate, prompt)) {
            promptInput = candidate;
            console.log(`Using candidate ${index + 1}`);
            break;
          }
        } catch (error) {
          console.warn(`Candidate ${index + 1} failed:`, error);
        }
      }

      if (!promptInput) {
        console.error(
          "All prompt candidates failed. Using aggressive fallback on candidate 1.",
        );
        promptInput = promptCandidates[0];
        await ensurePromptCommitted(promptInput, prompt, 10);
        await wait(2000);
      }

      await verifyPromptBeforeSubmit(promptInput, prompt);
      await wait(500);
      console.log("Prompt verified before submit.");

      console.log("Submitting prompt by Enter key (human-like flow)...");
      await submitPromptLikeUser(promptInput, generateButton, prompt);
      const submitResult = await waitForGenerationStart(
        promptInput,
        generateButton,
        prompt,
      );
      if (!submitResult.success) {
        console.warn(
          "Flow did not start generation after submit.",
          submitResult.error,
        );
        return {
          success: false,
          error:
            submitResult.error || "Flow did not start generation after submit.",
        };
      }
      if (config.notifyComplete || config.reloadAfterComplete) {
        monitorGeneration();
      }

      return { success: true };
    } catch (error) {
      if (isStopError(error)) {
        return { success: false, stopped: true, error: STOPPED_ERROR_MESSAGE };
      }

      console.error("Generation error:", error.message, error.stack);

      // Retry logic
      if (config.autoRetry && retryCount < config.maxRetries) {
        console.log(
          `Retrying... Attempt ${retryCount + 1} of ${config.maxRetries}`,
        );

        chrome.runtime.sendMessage({
          action: "updateStatus",
          message: `⚠️ Retrying... (${retryCount + 1}/${config.maxRetries})`,
          type: "warning",
        });

        await wait(config.retryDelay);
        return startVideoGeneration(prompt, retryCount + 1);
      }

      // Send error message
      chrome.runtime.sendMessage({
        action: "updateStatus",
        message: "❌ " + error.message,
        type: "error",
      });

      return { success: false, error: error.message };
    }
  }

  // Monitor generation progress
  function monitorGeneration() {
    console.log("Monitoring generation progress...");
    clearGenerationMonitor();

    let sawActiveGeneration = hasGenerationStarted();
    let inactivePollCount = 0;

    generationMonitorIntervalId = setInterval(() => {
      if (stopRequested) {
        clearGenerationMonitor();
        return;
      }

      const activeNow = hasGenerationStarted();

      if (activeNow) {
        sawActiveGeneration = true;
        inactivePollCount = 0;
        return;
      }

      if (!sawActiveGeneration) {
        return;
      }

      inactivePollCount += 1;
      if (inactivePollCount < 2) {
        return;
      }

      console.log(
        "Generation appears to be complete after active state ended.",
      );
      clearGenerationMonitor();

      const mediaLabel =
        config.generationOptions.mediaType === "image" ? "Image" : "Video";
      chrome.runtime.sendMessage({
        action: "updateStatus",
        message: `✓ ${mediaLabel} generation complete! No duplicates - prompt box fix worked correctly.`,
        type: "success",
      });

      if (Notification.permission === "granted") {
        new Notification("Google Flow Auto Generator", {
          body: `Your ${mediaLabel.toLowerCase()} generation appears complete.`,
          icon: "icon48.png",
        });
      }

      // Keep current page context; do not auto-reload.
    }, 3000);

    // Stop monitoring after 5 minutes
    generationMonitorTimeoutId = setTimeout(() => {
      clearGenerationMonitor();
    }, 300000);
  }

  // Listen for messages from popup
  async function runGenerationRequest(message) {
    if (message.action === "stopGeneration") {
      return stopAutomation(STOPPED_ERROR_MESSAGE, true);
    }

    if (message.action === "clearAutomationData") {
      clearQueueStateV2();
      clearGenerationMonitor();
      stopRequested = false;
      return { success: true, message: "Automation data cleared." };
    }

    stopRequested = false;
    config.autoRetry =
      message.autoRetry !== undefined ? message.autoRetry : true;
    config.notifyComplete =
      message.notifyComplete !== undefined ? message.notifyComplete : true;
    // Hard-disable auto reload to avoid black/blank page interruptions.
    config.reloadAfterComplete = false;
    config.skipStyleAutomation =
      message.skipStyleAutomation !== undefined
        ? message.skipStyleAutomation
        : true;
    config.generationOptions = {
      ...config.generationOptions,
      ...(message.generationOptions || {}),
    };

    if (message.action === "startQueueGeneration") {
      return processPromptQueue(message.prompts, message.delayBetween || 10000);
    }

    return startVideoGeneration(message.prompt);
  }

  const runtimeMessageListener = (message, sender, sendResponse) => {
    if (message.action === "ping") {
      sendResponse({ success: true, version: CONTENT_SCRIPT_VERSION });
      return false;
    }

    if (
      message.action !== "startGeneration" &&
      message.action !== "startQueueGeneration" &&
      message.action !== "stopGeneration" &&
      message.action !== "clearAutomationData"
    ) {
      return false;
    }

    runGenerationRequest(message)
      .then((result) => {
        sendResponse(result);
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message });
      });

    // Return true to indicate async response
    return true;
  };

  chrome.runtime.onMessage.addListener(runtimeMessageListener);

  globalThis.__flowAutoGeneratorApi = {
    version: CONTENT_SCRIPT_VERSION,
    runGenerationRequest,
  };

  window.__flowAutoGeneratorCleanup = () => {
    try {
      chrome.runtime.onMessage.removeListener(runtimeMessageListener);
    } catch (error) {
      console.warn("Failed to remove Flow Auto Generator listener:", error);
    }

    try {
      delete globalThis.__flowAutoGeneratorApi;
    } catch (error) {
      console.warn("Failed to clear Flow Auto Generator API:", error);
    }
  };

  resumeQueueAfterReloadIfNeededV2();

  // Request notification permission
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
})();
