import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { verifyToolLicenseToken } from "@/lib/tool-license";

export const runtime = "nodejs";

const FLOW_TOOL_FALLBACK_SLUG = "google-flow-auto-generator";
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 90;
const rateLimitState = new Map();

const PROMPT_SELECTORS = [
  'div[role="textbox"][data-slate-editor="true"][data-slate-node="value"][contenteditable="true"]',
  'div[role="textbox"][data-slate-editor="true"][contenteditable="true"]',
  '[role="textbox"][contenteditable="true"]',
  'textarea[placeholder*="prompt"]',
  'textarea[aria-label*="prompt"]',
  "textarea",
  '[contenteditable="true"]',
];

const GENERATE_SELECTORS = [
  'button[aria-label*="generate"]',
  'button[title*="generate"]',
  'button[type="submit"]',
  'button svg',
];

function parseBearer(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return "";
  return authHeader.slice(7).trim();
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildRateLimitKey(payload, request, requestedToolSlug) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  return [payload.licenseId, payload.deviceId, requestedToolSlug, ip].join(":");
}

function checkRateLimit(key) {
  const now = Date.now();
  const current = rateLimitState.get(key);
  if (!current || now >= current.resetAt) {
    const next = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitState.set(key, next);
    return next;
  }

  current.count += 1;
  rateLimitState.set(key, current);
  return current;
}

function normalizeVideoMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("ingredient")) return "Ingredients";
  if (normalized.includes("frame")) return "Frames";
  if (normalized.includes("text")) return "Text to Video";
  return value;
}

function capitalize(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function buildTaskSequence({ prompt, generationOptions }) {
  const tasks = [
    {
      action: "waitForElement",
      selectors: PROMPT_SELECTORS,
      timeoutMs: 20000,
      description: "Wait for Flow prompt field",
    },
    {
      action: "typeText",
      selectors: PROMPT_SELECTORS,
      text: prompt,
      description: "Type prompt",
    },
  ];

  const mediaType = String(generationOptions?.mediaType ?? "video").trim().toLowerCase();
  const model = String(generationOptions?.model ?? "").trim();
  const videoMode = normalizeVideoMode(generationOptions?.videoMode);
  const orientation = capitalize(generationOptions?.orientation);
  const variantCount = String(generationOptions?.variantCount ?? "1").trim();

  if (mediaType === "image") {
    tasks.push({
      action: "clickByText",
      texts: ["Image"],
      optional: true,
      description: "Switch to image mode",
    });
  } else {
    tasks.push({
      action: "clickByText",
      texts: ["Video"],
      optional: true,
      description: "Ensure video mode is active",
    });
  }

  if (mediaType === "video" && videoMode) {
    tasks.push({
      action: "clickByText",
      texts: [videoMode],
      optional: true,
      description: `Choose ${videoMode}`,
    });
  }

  if (model) {
    tasks.push({
      action: "clickByText",
      texts: [model],
      optional: true,
      description: `Choose ${model}`,
    });
  }

  if (orientation) {
    tasks.push({
      action: "clickByText",
      texts: [orientation],
      optional: true,
      description: `Choose ${orientation}`,
    });
  }

  if (variantCount) {
    tasks.push({
      action: "clickByText",
      texts: [`x${variantCount}`, variantCount],
      optional: true,
      description: `Choose x${variantCount}`,
    });
  }

  tasks.push({
    action: "clickGenerate",
    selectors: GENERATE_SELECTORS,
    texts: ["Generate", "Create"],
    description: "Click generate",
  });

  return tasks;
}

export async function POST(request) {
  try {
    const auth = await getAuthUser(request);
    const body = await request.json().catch(() => ({}));
    const prompt = String(body.prompt ?? "").trim();
    const currentStep = Number(body.currentStep ?? 0);
    const requestedToolSlug = String(
      request.headers.get("x-tool-slug") || body.toolSlug || FLOW_TOOL_FALLBACK_SLUG
    ).trim();
    const requestedDeviceId = String(
      request.headers.get("x-device-id") || body.deviceId || ""
    ).trim();
    const authToken = parseBearer(request);
    const generationOptions =
      body && typeof body.generationOptions === "object" && body.generationOptions
        ? body.generationOptions
        : {};

    if (!authToken) {
      return NextResponse.json(
        {
          success: false,
          error: "License token required.",
        },
        { status: 401 }
      );
    }

    const payload = verifyToolLicenseToken(authToken);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid license token.",
        },
        { status: 403 }
      );
    }

    if (auth && Number(payload.userId) !== Number(auth.userId)) {
      return NextResponse.json(
        {
          success: false,
          error: "License token does not match the logged-in user.",
        },
        { status: 403 }
      );
    }

    if (requestedToolSlug && payload.slug !== requestedToolSlug) {
      return NextResponse.json(
        {
          success: false,
          error: "License does not match this tool.",
        },
        { status: 403 }
      );
    }

    if (requestedDeviceId && payload.deviceId !== requestedDeviceId) {
      return NextResponse.json(
        {
          success: false,
          error: "License token does not match this device.",
        },
        { status: 403 }
      );
    }

    const [licenseRows] = await db.query(
      `
      SELECT id, status, expires_at, product_id, user_id
      FROM tool_license_keys
      WHERE id = ?
      LIMIT 1
      `,
      [payload.licenseId]
    );
    if (licenseRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "License not found.",
        },
        { status: 403 }
      );
    }

    const license = licenseRows[0];
    if (
      Number(license.user_id) !== Number(payload.userId) ||
      Number(license.product_id) !== Number(payload.productId)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "License token mismatch.",
        },
        { status: 403 }
      );
    }

    if (license.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          error: `License is ${license.status}.`,
        },
        { status: 403 }
      );
    }

    const expiresAt = toDate(license.expires_at);
    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      await db.query(
        `UPDATE tool_license_keys SET status='expired' WHERE id = ?`,
        [license.id]
      );
      return NextResponse.json(
        {
          success: false,
          error: "License expired.",
        },
        { status: 403 }
      );
    }

    const [activationRows] = await db.query(
      `
      SELECT id
      FROM tool_license_activations
      WHERE license_id = ? AND device_id = ?
      LIMIT 1
      `,
      [payload.licenseId, payload.deviceId]
    );
    if (activationRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Device activation not found for this license.",
        },
        { status: 403 }
      );
    }

    const rateLimit = checkRateLimit(buildRateLimitKey(payload, request, requestedToolSlug));
    if (rateLimit.count > RATE_LIMIT_MAX_REQUESTS) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many Flow task requests. Slow down and try again.",
          retryAfterMs: Math.max(0, rateLimit.resetAt - Date.now()),
        },
        { status: 429 }
      );
    }

    await db.query(
      `
      INSERT INTO tool_license_activations (license_id, device_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP
      `,
      [payload.licenseId, payload.deviceId]
    );

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Prompt is required.",
        },
        { status: 400 }
      );
    }

    const tasks = buildTaskSequence({ prompt, generationOptions });
    if (currentStep >= tasks.length) {
      return NextResponse.json({
        success: true,
        action: "complete",
        nextStep: currentStep,
        totalSteps: tasks.length,
      });
    }

    const task = tasks[currentStep];
    return NextResponse.json({
      success: true,
      ...task,
      currentStep,
      nextStep: currentStep + 1,
      totalSteps: tasks.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate Flow task.",
      },
      { status: 500 }
    );
  }
}
