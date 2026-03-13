(() => {
  const EXECUTOR_VERSION = "2026-03-12-hybrid";

  if (window.__flowHybridExecutor?.version === EXECUTOR_VERSION) {
    return;
  }

  function normalizeText(value = "") {
    return String(value).replace(/\s+/g, " ").trim().toLowerCase();
  }

  function isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none"
    );
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function queryFirst(selectors = []) {
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && isVisible(element)) {
          return element;
        }
      } catch {
        // ignore invalid selectors
      }
    }
    return null;
  }

  async function waitForElement(selectors, timeoutMs = 10000) {
    const startAt = Date.now();
    while (Date.now() - startAt < timeoutMs) {
      const element = queryFirst(selectors);
      if (element) return element;
      await wait(250);
    }
    throw new Error("Element not found before timeout.");
  }

  function findClickableByText(texts = []) {
    const expected = texts.map((text) => normalizeText(text)).filter(Boolean);
    if (!expected.length) return null;

    const candidates = Array.from(
      document.querySelectorAll(
        'button, [role="button"], [aria-pressed], [aria-selected], label, div, span'
      )
    );

    for (const candidate of candidates) {
      if (!isVisible(candidate)) continue;
      const candidateText = normalizeText(
        [
          candidate.textContent || "",
          candidate.getAttribute("aria-label") || "",
          candidate.getAttribute("title") || "",
        ].join(" ")
      );
      if (!candidateText) continue;
      if (expected.some((text) => candidateText === text || candidateText.includes(text))) {
        return candidate;
      }
    }

    return null;
  }

  function setElementValue(element, value) {
    if (!element) {
      throw new Error("Prompt element was not found.");
    }

    element.focus();
    element.click?.();

    if ("value" in element) {
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    element.textContent = value;
    element.dispatchEvent(new InputEvent("input", { bubbles: true, data: value }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function executeTask(task) {
    switch (task.action) {
      case "waitForElement": {
        await waitForElement(task.selectors, task.timeoutMs);
        return { success: true };
      }

      case "typeText": {
        const element = await waitForElement(task.selectors, task.timeoutMs || 10000);
        setElementValue(element, String(task.text ?? ""));
        if (task.delayMs) {
          await wait(task.delayMs);
        }
        return { success: true };
      }

      case "clickByText": {
        const element = findClickableByText(task.texts);
        if (!element) {
          if (task.optional) return { success: true, skipped: true };
          throw new Error(`Could not find clickable text: ${(task.texts || []).join(", ")}`);
        }
        element.click();
        if (task.delayMs) {
          await wait(task.delayMs);
        }
        return { success: true };
      }

      case "clickGenerate": {
        const element =
          queryFirst(task.selectors) ||
          findClickableByText(task.texts) ||
          queryFirst(['button[type="submit"]']);

        if (!element) {
          throw new Error("Generate button was not found.");
        }

        const clickable = element.closest("button, [role='button']") || element;
        clickable.click();
        if (task.delayMs) {
          await wait(task.delayMs);
        }
        return { success: true };
      }

      default:
        throw new Error(`Unsupported task action: ${task.action}`);
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "executeFlowTask") {
      return undefined;
    }

    executeTask(message.task)
      .then((result) => sendResponse(result))
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  });

  window.__flowHybridExecutor = {
    version: EXECUTOR_VERSION,
  };
})();
