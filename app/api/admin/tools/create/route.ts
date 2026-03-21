import type { PoolConnection } from "mysql2/promise";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateToolSlug,
  MAX_TOOL_DEVICES,
  type EmbeddedCustomHandlerKey,
  type ToolLicenseType,
  type ToolPlanType,
  type ToolRunMode,
  type ToolStatus,
  type ToolTemplateType,
} from "@/app/lib/tool-templates";

export const runtime = "nodejs";

type CreateToolBody = {
  title?: unknown;
  category_id?: unknown;
  description?: unknown;
  image_url?: unknown;
  status?: unknown;
  template_type?: unknown;
  price?: unknown;
  original_price?: unknown;
  plan_type?: unknown;
  duration_days?: unknown;
  max_devices?: unknown;
  login_required?: unknown;
  purchase_required?: unknown;
  license_required?: unknown;
  platform?: unknown;
  version?: unknown;
  download_url?: unknown;
  release_notes?: unknown;
  installation_instructions?: unknown;
  offline_use_allowed?: unknown;
  activation_required?: unknown;
  run_mode?: unknown;
  launch_url?: unknown;
  intro_text?: unknown;
  usage_instructions?: unknown;
  allow_guest_preview?: unknown;
  license_type?: unknown;
  activation_instructions?: unknown;
  delivery_instructions?: unknown;
  custom_handler_key?: unknown;
  custom_instructions?: unknown;
  enable_file_upload?: unknown;
  enable_download_output?: unknown;
  enable_tabs?: unknown;
};

const VALID_TEMPLATE_TYPES: ToolTemplateType[] = [
  "downloadable_exe",
  "online_web",
  "license_only",
  "embedded_custom",
];
const VALID_PLAN_TYPES: ToolPlanType[] = ["one_time", "subscription", "time_limited"];
const VALID_RUN_MODES: ToolRunMode[] = ["external_url", "internal_page"];
const VALID_LICENSE_TYPES: ToolLicenseType[] = ["single_device", "multi_device", "unlimited"];
const VALID_CUSTOM_HANDLER_KEYS: EmbeddedCustomHandlerKey[] = [
  "veo3",
  "video-editor",
  "prompt-ai-studio",
  "translate-video",
];

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isOneOf<T extends string>(value: unknown, options: T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;
}

async function hasColumn(
  connection: PoolConnection,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ?
      AND column_name = ?
    LIMIT 1
    `,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function ensureToolDefinitionSchema(connection: PoolConnection): Promise<boolean> {
  const [rows] = await connection.query<RowDataPacket[]>(
    `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name IN ('tool_definitions', 'tool_route_aliases')
    `
  );
  const names = new Set(rows.map((row) => String(row.table_name)));
  return names.has("tool_definitions") && names.has("tool_route_aliases");
}

async function ensureUniqueSlug(connection: PoolConnection, title: string): Promise<string> {
  const base = generateToolSlug(title) || `tool-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  for (;;) {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM products WHERE slug = ? LIMIT 1`,
      [candidate]
    );
    if (rows.length === 0) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function buildDurationLabel(planType: ToolPlanType, durationDays: number | null): string {
  if (planType === "one_time" || !durationDays) return "Lifetime Access";
  return `${durationDays} Days`;
}

function buildDeviceLabel(maxDevices: number, unlimited: boolean): string {
  if (unlimited) return "Multiple devices";
  return maxDevices === 1 ? "1 device" : `${maxDevices} devices`;
}

function buildToolDefinitionPayload(args: {
  slug: string;
  title: string;
  description: string;
  templateType: ToolTemplateType;
  loginRequired: boolean;
  purchaseRequired: boolean;
  licenseRequired: boolean;
  platform: string;
  version: string;
  downloadUrl: string;
  releaseNotes: string;
  installationInstructions: string;
  offlineUseAllowed: boolean;
  activationRequired: boolean;
  runMode: ToolRunMode;
  launchUrl: string;
  introText: string;
  usageInstructions: string;
  allowGuestPreview: boolean;
  licenseType: ToolLicenseType;
  activationInstructions: string;
  deliveryInstructions: string;
  customHandlerKey: EmbeddedCustomHandlerKey;
  customInstructions: string;
  enableFileUpload: boolean;
  enableDownloadOutput: boolean;
  enableTabs: boolean;
}) {
  const subtitle = args.description;
  const defaultAccessModel = args.licenseRequired
    ? "license"
    : args.purchaseRequired
      ? "purchase"
      : "none";

  if (args.templateType === "downloadable_exe") {
    return {
      handlerKey: "generic-download-tool",
      toolKind: "downloadable",
      accessModel: defaultAccessModel,
      deliveryModel: args.licenseRequired ? "download+license" : "download",
      configJson: {
        version: 1,
        display: {
          title: args.title,
          subtitle,
          icon: "download",
          theme: "download",
        },
        purchase: {
          buySlug: args.slug,
          productSlug: args.slug,
          requiresLogin: args.loginRequired,
          requiresPurchase: args.purchaseRequired,
          requiresLicenseActivation: args.activationRequired && args.licenseRequired,
        },
        access: {
          deviceIdKey: "gstech_tool_device_id",
          licenseStorageKey: args.licenseRequired ? `gstech_tool_license_${args.slug}` : null,
          allowGuestPreview: false,
        },
        routing: {
          canonicalSlug: args.slug,
          aliases: [],
        },
        ui: {
          installationInstructions: args.installationInstructions,
          releaseNotes: args.releaseNotes,
        },
        features: {
          platform: args.platform,
          version: args.version,
          downloadUrl: args.downloadUrl,
          offlineUseAllowed: args.offlineUseAllowed,
          allowDirectDownload: true,
        },
        api: {},
      },
    } as const;
  }

  if (args.templateType === "online_web") {
    return {
      handlerKey: "generic-online-tool",
      toolKind: "online",
      accessModel: defaultAccessModel,
      deliveryModel: "web",
      configJson: {
        version: 1,
        display: {
          title: args.title,
          subtitle,
          icon: "globe",
          theme: "web",
        },
        purchase: {
          buySlug: args.slug,
          productSlug: args.slug,
          requiresLogin: args.loginRequired,
          requiresPurchase: args.purchaseRequired,
          requiresLicenseActivation: args.activationRequired && args.licenseRequired,
        },
        access: {
          deviceIdKey: "gstech_tool_device_id",
          licenseStorageKey: args.licenseRequired ? `gstech_tool_license_${args.slug}` : null,
          allowGuestPreview: args.allowGuestPreview,
        },
        routing: {
          canonicalSlug: args.slug,
          aliases: [],
        },
        ui: {
          introText: args.introText,
          usageInstructions: args.usageInstructions,
          embedInFrame: false,
        },
        features: {
          runMode: args.runMode,
          launchUrl: args.launchUrl,
        },
        api: {},
      },
    } as const;
  }

  if (args.templateType === "license_only") {
    return {
      handlerKey: "generic-license-tool",
      toolKind: "offline_licensed",
      accessModel: "license",
      deliveryModel: "license",
      configJson: {
        version: 1,
        display: {
          title: args.title,
          subtitle,
          icon: "key",
          theme: "license",
        },
        purchase: {
          buySlug: args.slug,
          productSlug: args.slug,
          requiresLogin: true,
          requiresPurchase: true,
          requiresLicenseActivation: true,
        },
        access: {
          deviceIdKey: "gstech_tool_device_id",
          licenseStorageKey: `gstech_tool_license_${args.slug}`,
          allowGuestPreview: false,
        },
        routing: {
          canonicalSlug: args.slug,
          aliases: [],
        },
        ui: {
          activationInstructions: args.activationInstructions,
          deliveryInstructions: args.deliveryInstructions,
          supportText: "Your license and delivery instructions are managed automatically.",
        },
        features: {
          licenseType: args.licenseType,
        },
        api: {},
      },
    } as const;
  }

  return {
    handlerKey: args.customHandlerKey,
    toolKind: "embedded",
    accessModel: defaultAccessModel,
    deliveryModel: "web",
    configJson: {
      version: 1,
      display: {
        title: args.title,
        subtitle,
        icon: "box",
        theme: "custom",
      },
      purchase: {
        buySlug: args.slug,
        productSlug: args.slug,
        requiresLogin: args.loginRequired,
        requiresPurchase: args.purchaseRequired,
        requiresLicenseActivation: args.activationRequired && args.licenseRequired,
      },
      access: {
        deviceIdKey: "gstech_tool_device_id",
        licenseStorageKey: args.licenseRequired ? `gstech_tool_license_${args.slug}` : null,
        allowGuestPreview: false,
      },
      routing: {
        canonicalSlug: args.slug,
        aliases: [],
      },
      ui: {
        customInstructions: args.customInstructions,
      },
      features: {
        enableFileUpload: args.enableFileUpload,
        enableDownloadOutput: args.enableDownloadOutput,
        enableTabs: args.enableTabs,
      },
      api: {},
    },
  } as const;
}

export async function POST(req: Request) {
  const auth = await getAuthUser(req);
  if (!auth || auth.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as CreateToolBody;

  const title = readString(body.title);
  const description = readString(body.description);
  const imageUrl = readString(body.image_url);
  const status = isOneOf(body.status, ["draft", "published"], "draft") as ToolStatus;
  const templateType = isOneOf(body.template_type, VALID_TEMPLATE_TYPES, "downloadable_exe");
  const planType = isOneOf(body.plan_type, VALID_PLAN_TYPES, "one_time");
  const categoryId = Number(body.category_id);
  const price = readNumber(body.price);
  const originalPrice = readNumber(body.original_price);
  const durationDays = readNumber(body.duration_days);
  const loginRequired = readBoolean(body.login_required, true);
  const purchaseRequired = readBoolean(body.purchase_required, true);
  const platform = readString(body.platform, "Windows");
  const version = readString(body.version);
  const downloadUrl = readString(body.download_url);
  const releaseNotes = readString(body.release_notes);
  const installationInstructions = readString(body.installation_instructions);
  const offlineUseAllowed = readBoolean(body.offline_use_allowed, true);
  const activationRequired = readBoolean(body.activation_required, true);
  const runMode = isOneOf(body.run_mode, VALID_RUN_MODES, "external_url");
  const launchUrl = readString(body.launch_url);
  const introText = readString(body.intro_text);
  const usageInstructions = readString(body.usage_instructions);
  const allowGuestPreview = readBoolean(body.allow_guest_preview, false);
  const licenseType = isOneOf(body.license_type, VALID_LICENSE_TYPES, "single_device");
  const activationInstructions = readString(body.activation_instructions);
  const deliveryInstructions = readString(body.delivery_instructions);
  const customHandlerKey = isOneOf(
    body.custom_handler_key,
    VALID_CUSTOM_HANDLER_KEYS,
    "prompt-ai-studio"
  );
  const customInstructions = readString(body.custom_instructions);
  const enableFileUpload = readBoolean(body.enable_file_upload, false);
  const enableDownloadOutput = readBoolean(body.enable_download_output, false);
  const enableTabs = readBoolean(body.enable_tabs, false);

  let licenseRequired = readBoolean(
    body.license_required,
    templateType === "downloadable_exe" || templateType === "license_only"
  );
  if (templateType === "license_only") {
    licenseRequired = true;
  }

  if (!title) {
    return Response.json({ error: "Tool name is required" }, { status: 400 });
  }
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return Response.json({ error: "Valid category is required" }, { status: 400 });
  }
  if (price === null || price < 0) {
    return Response.json({ error: "Valid price is required" }, { status: 400 });
  }
  if (templateType === "downloadable_exe" && !downloadUrl) {
    return Response.json({ error: "Download file or URL is required" }, { status: 400 });
  }
  if (templateType === "online_web" && !launchUrl) {
    return Response.json({ error: "Launch URL is required" }, { status: 400 });
  }

  const unlimitedDevices = licenseType === "unlimited";
  const requestedMaxDevices = readNumber(body.max_devices);
  const maxDevices = unlimitedDevices
    ? MAX_TOOL_DEVICES
    : Math.min(
        MAX_TOOL_DEVICES,
        Math.max(1, Number.isFinite(Number(requestedMaxDevices)) ? Number(requestedMaxDevices) : 1)
      );

  const connection = await db.getConnection();

  try {
    if (!(await ensureToolDefinitionSchema(connection))) {
      return Response.json(
        { error: "Tool definition schema is missing. Run sql/11-tool-definitions.sql first." },
        { status: 503 }
      );
    }

    const [categoryRows] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM product_categories WHERE id = ? LIMIT 1",
      [categoryId]
    );
    if (categoryRows.length === 0) {
      return Response.json({ error: "Category not found" }, { status: 400 });
    }

    const slug = await ensureUniqueSlug(connection, title);
    const isActive = status === "published" ? 1 : 0;
    const toolDefinition = buildToolDefinitionPayload({
      slug,
      title,
      description,
      templateType,
      loginRequired,
      purchaseRequired,
      licenseRequired,
      platform,
      version,
      downloadUrl,
      releaseNotes,
      installationInstructions,
      offlineUseAllowed,
      activationRequired,
      runMode,
      launchUrl,
      introText,
      usageInstructions,
      allowGuestPreview,
      licenseType,
      activationInstructions,
      deliveryInstructions,
      customHandlerKey,
      customInstructions,
      enableFileUpload,
      enableDownloadOutput,
      enableTabs,
    });

    await connection.beginTransaction();

    const hasDescription = await hasColumn(connection, "products", "description");
    const hasImageUrl = await hasColumn(connection, "products", "image_url");
    const hasMode = await hasColumn(connection, "products", "mode");

    const productColumns = ["title", "slug", "category_id", "posted_by", "is_active"];
    const productValues: Array<string | number | null> = [title, slug, categoryId, auth.userId, isActive];

    if (hasDescription) {
      productColumns.push("description");
      productValues.push(description || null);
    }
    if (hasImageUrl) {
      productColumns.push("image_url");
      productValues.push(imageUrl || null);
    }
    if (hasMode) {
      productColumns.push("mode");
      productValues.push(templateType === "license_only" ? "license" : "inventory");
    }

    const [productResult] = await connection.query<ResultSetHeader>(
      `
      INSERT INTO products (${productColumns.join(", ")})
      VALUES (${productColumns.map(() => "?").join(", ")})
      `,
      productValues
    );

    const productId = Number(productResult.insertId);
    const durationLabel = buildDurationLabel(planType, durationDays);
    const durationNote =
      planType === "subscription"
        ? "Subscription plan"
        : planType === "time_limited"
          ? "Time-limited access"
          : "Lifetime access";

    await connection.query<ResultSetHeader>(
      `
      INSERT INTO tool_variants
        (
          product_id,
          duration_label,
          duration_note,
          duration_days,
          device_label,
          device_type,
          device_limit,
          is_unlimited_device,
          original_price,
          price,
          khqr,
          usdqr,
          is_active
        )
      VALUES (?, ?, ?, ?, ?, 'any', ?, ?, ?, ?, '/paymentQR/khmer_qr.jpg', 'none', ?)
      `,
      [
        productId,
        durationLabel,
        durationNote,
        planType === "one_time" ? null : durationDays ?? 30,
        buildDeviceLabel(maxDevices, unlimitedDevices),
        maxDevices,
        unlimitedDevices ? 1 : 0,
        originalPrice ?? price,
        price,
        isActive,
      ]
    );

    const [toolDefinitionResult] = await connection.query<ResultSetHeader>(
      `
      INSERT INTO tool_definitions
        (
          product_id,
          canonical_slug,
          handler_key,
          tool_kind,
          access_model,
          delivery_model,
          launch_path,
          embedded_entry,
          config_json,
          is_active
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        productId,
        slug,
        toolDefinition.handlerKey,
        toolDefinition.toolKind,
        toolDefinition.accessModel,
        toolDefinition.deliveryModel,
        `/tools-ai/${slug}`,
        templateType === "embedded_custom" ? customHandlerKey : null,
        JSON.stringify(toolDefinition.configJson),
        isActive,
      ]
    );

    await connection.commit();

    return Response.json({
      success: true,
      productId,
      toolDefinitionId: Number(toolDefinitionResult.insertId),
      slug,
    });
  } catch (err) {
    await connection.rollback().catch(() => {});
    console.error("ADMIN CREATE TOOL ERROR:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create tool" },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

