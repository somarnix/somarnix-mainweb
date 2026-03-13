(() => {
  const PAGE_SOURCE = "edugroit-flow-page";
  const EXTENSION_SOURCE = "edugroit-flow-extension";

  function postToPage(message) {
    window.postMessage(
      {
        source: EXTENSION_SOURCE,
        ...message,
      },
      window.location.origin
    );
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;

    const data = event.data || {};
    if (data.source !== PAGE_SOURCE || !data.action) return;

    chrome.runtime.sendMessage(
      {
        action: `website:${data.action}`,
        payload: data.payload || {},
      },
      (response) => {
        postToPage({
          type: "response",
          requestId: data.requestId,
          response,
          error: chrome.runtime.lastError?.message || null,
        });
      }
    );
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "flowWebsiteStatus") return undefined;
    postToPage({
      type: "status",
      payload: message.payload || {},
    });
    return undefined;
  });

  postToPage({
    type: "ready",
    payload: { installed: true },
  });
})();
