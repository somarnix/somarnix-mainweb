// background.js
// Background service worker for Google Flow Auto Generator
console.log("Google Flow Auto Generator background script loaded");

// Handle installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Extension installed!");

    // Set default settings
    chrome.storage.local.set({
      autoRetry: true,
      notifyComplete: true,
      projectUrl: "https://labs.google/fx/tools/flow",
      projectId: "",
    });

    // Open welcome page or instructions
    chrome.tabs.create({
      url: "https://labs.google/fx/tools/flow",
    });
  } else if (details.reason === "update") {
    console.log("Extension updated!");
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  // Forward status updates to popup if it's open
  if (message.action === "updateStatus") {
    // Try to send to popup
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup might not be open, that's okay
      console.log("Popup not open, status update not forwarded");
    });
  }

  // Handle other background tasks here
  if (message.action === "notify") {
    // Show browser notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon128.png",
      title: message.title || "Google Flow Auto Generator",
      message: message.message || "Task completed!",
      priority: 2,
    });
  }

  return true;
});

// Do not auto-inject content scripts on every navigation.
// Popup injects on-demand before run/test actions.

// Context menu (right-click) option
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "autoGenerate",
    title: "Auto Generate Video",
    contexts: ["page"],
    documentUrlPatterns: ["https://labs.google/fx/tools/flow/*"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "autoGenerate") {
    // Open popup or trigger generation
    chrome.action.openPopup();
  }
});
