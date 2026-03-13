let config = {
  projectId: "",
  projectUrl: "https://labs.google/fx/tools/flow/project/",
  mediaType: "video",
  model: "Veo 3.1 - Fast",
  videoMode: "Ingredients",
  orientation: "Portrait",
  variantCount: 1,
  autoRetry: true,
  notifyComplete: true,
  maxRetries: 5,
};

let queue = [];
let running = false;
let activeIndex = -1;

function post(type, payload = {}) {
  self.postMessage({
    type,
    timestamp: Date.now(),
    ...payload,
  });
}

function sanitizePrompts(input) {
  return String(input ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((prompt, index) => ({
      id: `${Date.now()}-${index}`,
      prompt,
      status: "pending",
      retries: 0,
    }));
}

function getActivePrompt() {
  if (activeIndex < 0 || activeIndex >= queue.length) return null;
  return queue[activeIndex];
}

function sendQueueState(message, status = "idle") {
  post("queueUpdate", {
    message,
    status,
    queue,
    activePrompt: getActivePrompt(),
    config,
    running,
  });
}

function startQueue(promptInput) {
  queue = sanitizePrompts(promptInput);
  if (queue.length === 0) {
    running = false;
    activeIndex = -1;
    post("error", {
      message: "Add at least one prompt before starting the queue.",
      status: "empty_queue",
    });
    return;
  }

  running = true;
  activeIndex = 0;
  queue[0].status = "ready";
  sendQueueState("Queue started. Open Flow and submit the active prompt.", "ready");
}

self.onmessage = async (event) => {
  const { action, promptInput, options } = event.data ?? {};

  switch (action) {
    case "setConfig":
      config = { ...config, ...(options ?? {}) };
      sendQueueState("Flow configuration updated.", "config_updated");
      break;

    case "startQueue":
      startQueue(promptInput);
      break;

    case "openFlow":
      post("needsAction", {
        message: "Open Google Flow manually in a new tab or window.",
        action: "open_flow_page",
        url: config.projectUrl,
        config,
      });
      break;

    case "markSubmitted": {
      const activePrompt = getActivePrompt();
      if (!activePrompt) {
        post("error", { message: "No active prompt to mark as submitted." });
        break;
      }
      activePrompt.status = "submitted";
      sendQueueState("Current prompt marked as submitted.", "submitted");
      break;
    }

    case "markCompleted": {
      const activePrompt = getActivePrompt();
      if (!activePrompt) {
        post("error", { message: "No active prompt to mark as completed." });
        break;
      }
      activePrompt.status = "completed";
      activeIndex += 1;
      if (activeIndex < queue.length) {
        queue[activeIndex].status = "ready";
        sendQueueState("Prompt completed. Next prompt is ready.", "ready");
      } else {
        running = false;
        activeIndex = -1;
        post("success", {
          message: "Queue completed.",
          status: "completed",
          queue,
          config,
        });
      }
      break;
    }

    case "stop":
      running = false;
      if (activeIndex >= 0 && activeIndex < queue.length && queue[activeIndex].status === "ready") {
        queue[activeIndex].status = "pending";
      }
      activeIndex = -1;
      sendQueueState("Queue stopped.", "stopped");
      break;

    default:
      post("ready", {
        message: "Flow worker initialized.",
        status: "ready",
        config,
        queue,
      });
  }
};

post("ready", {
  message: "Flow worker initialized.",
  status: "ready",
  config,
  queue,
});
