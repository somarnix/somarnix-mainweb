import type { RowDataPacket } from "mysql2";

import { db } from "@/lib/db";

export type ToolKind = "online" | "downloadable" | "offline_licensed" | "embedded";
export type ToolAccessModel = "none" | "purchase" | "license";
export type ToolDeliveryModel = "web" | "download" | "license" | "download+license";

export type ToolDefinitionConfig = {
  version: number;
  display: {
    title: string;
    subtitle: string;
    icon: string;
    theme: string;
  };
  purchase: {
    buySlug: string;
    productSlug: string;
    requiresLogin: boolean;
    requiresPurchase: boolean;
    requiresLicenseActivation: boolean;
  };
  access: {
    deviceIdKey: string | null;
    licenseStorageKey: string | null;
    allowGuestPreview: boolean;
  };
  routing: {
    canonicalSlug: string;
    aliases: string[];
  };
  ui: Record<string, unknown>;
  features: Record<string, unknown>;
  api: Record<string, unknown>;
};

export type ToolDefinitionRecord = {
  id: number;
  productId: number;
  canonicalSlug: string;
  productSlug: string;
  productTitle: string;
  handlerKey: string;
  toolKind: ToolKind;
  accessModel: ToolAccessModel;
  deliveryModel: ToolDeliveryModel;
  launchPath: string | null;
  embeddedEntry: string | null;
  isActive: boolean;
  aliases: string[];
  config: ToolDefinitionConfig;
};

type ToolDefinitionRow = RowDataPacket & {
  id: number;
  product_id: number;
  canonical_slug: string;
  handler_key: string;
  tool_kind: ToolKind;
  access_model: ToolAccessModel;
  delivery_model: ToolDeliveryModel;
  launch_path: string | null;
  embedded_entry: string | null;
  config_json: string | null;
  is_active: number;
  product_slug: string;
  product_title: string;
};

type AliasRow = RowDataPacket & {
  alias_slug: string;
};

const TOOL_KINDS: readonly ToolKind[] = ["online", "downloadable", "offline_licensed", "embedded"];
const TOOL_ACCESS_MODELS: readonly ToolAccessModel[] = ["none", "purchase", "license"];
const TOOL_DELIVERY_MODELS: readonly ToolDeliveryModel[] = ["web", "download", "license", "download+license"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isToolKind(value: unknown): value is ToolKind {
  return typeof value === "string" && (TOOL_KINDS as readonly string[]).includes(value);
}

function isToolAccessModel(value: unknown): value is ToolAccessModel {
  return typeof value === "string" && (TOOL_ACCESS_MODELS as readonly string[]).includes(value);
}

function isToolDeliveryModel(value: unknown): value is ToolDeliveryModel {
  return typeof value === "string" && (TOOL_DELIVERY_MODELS as readonly string[]).includes(value);
}

export function parseToolDefinitionConfig(input: unknown, defaults: {
  canonicalSlug: string;
  productSlug: string;
  productTitle: string;
}): ToolDefinitionConfig {
  const root = isRecord(input) ? input : {};
  const display = isRecord(root.display) ? root.display : {};
  const purchase = isRecord(root.purchase) ? root.purchase : {};
  const access = isRecord(root.access) ? root.access : {};
  const routing = isRecord(root.routing) ? root.routing : {};
  const ui = isRecord(root.ui) ? root.ui : {};
  const features = isRecord(root.features) ? root.features : {};
  const api = isRecord(root.api) ? root.api : {};

  const versionRaw = Number(root.version);
  const version = Number.isFinite(versionRaw) && versionRaw > 0 ? Math.floor(versionRaw) : 1;

  const buySlug = readString(purchase.buySlug, defaults.productSlug);
  const productSlug = readString(purchase.productSlug, defaults.productSlug);
  const title = readString(display.title, defaults.productTitle);

  return {
    version,
    display: {
      title,
      subtitle: readString(display.subtitle, ""),
      icon: readString(display.icon, "box"),
      theme: readString(display.theme, "default"),
    },
    purchase: {
      buySlug,
      productSlug,
      requiresLogin: readBoolean(purchase.requiresLogin, true),
      requiresPurchase: readBoolean(purchase.requiresPurchase, true),
      requiresLicenseActivation: readBoolean(purchase.requiresLicenseActivation, false),
    },
    access: {
      deviceIdKey:
        access.deviceIdKey === null ? null : readString(access.deviceIdKey, "somarnix_tool_device_id"),
      licenseStorageKey:
        access.licenseStorageKey === null ? null : readString(access.licenseStorageKey, `somarnix_tool_license_${productSlug}`),
      allowGuestPreview: readBoolean(access.allowGuestPreview, false),
    },
    routing: {
      canonicalSlug: readString(routing.canonicalSlug, defaults.canonicalSlug),
      aliases: readStringArray(routing.aliases),
    },
    ui,
    features,
    api,
  };
}

export function normalizeToolDefinition(row: ToolDefinitionRow, aliases: string[]): ToolDefinitionRecord {
  const parsedJson = row.config_json ? JSON.parse(row.config_json) : null;
  const config = parseToolDefinitionConfig(parsedJson, {
    canonicalSlug: row.canonical_slug,
    productSlug: row.product_slug,
    productTitle: row.product_title,
  });

  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    canonicalSlug: row.canonical_slug,
    productSlug: row.product_slug,
    productTitle: row.product_title,
    handlerKey: row.handler_key,
    toolKind: isToolKind(row.tool_kind) ? row.tool_kind : "embedded",
    accessModel: isToolAccessModel(row.access_model) ? row.access_model : "purchase",
    deliveryModel: isToolDeliveryModel(row.delivery_model) ? row.delivery_model : "web",
    launchPath: row.launch_path ?? null,
    embeddedEntry: row.embedded_entry ?? null,
    isActive: Number(row.is_active) === 1,
    aliases,
    config: {
      ...config,
      routing: {
        ...config.routing,
        canonicalSlug: row.canonical_slug,
        aliases,
      },
    },
  };
}

export async function hasToolDefinitionSchema(): Promise<boolean> {
  const [rows] = await db.query<RowDataPacket[]>(
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

export async function resolveToolDefinitionBySlug(slug: string): Promise<ToolDefinitionRecord | null> {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) return null;
  if (!(await hasToolDefinitionSchema())) return null;

  const [rows] = await db.query<ToolDefinitionRow[]>(
    `
    SELECT
      td.id,
      td.product_id,
      td.canonical_slug,
      td.handler_key,
      td.tool_kind,
      td.access_model,
      td.delivery_model,
      td.launch_path,
      td.embedded_entry,
      td.config_json,
      td.is_active,
      p.slug AS product_slug,
      p.title AS product_title
    FROM tool_definitions td
    JOIN products p ON p.id = td.product_id
    LEFT JOIN tool_route_aliases tra ON tra.tool_definition_id = td.id
    WHERE td.canonical_slug = ? OR tra.alias_slug = ?
    ORDER BY td.id ASC
    LIMIT 1
    `,
    [normalizedSlug, normalizedSlug]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  const [aliasRows] = await db.query<AliasRow[]>(
    `
    SELECT alias_slug
    FROM tool_route_aliases
    WHERE tool_definition_id = ?
    ORDER BY alias_slug ASC
    `,
    [row.id]
  );

  const aliases = aliasRows
    .map((alias) => alias.alias_slug)
    .filter((alias) => typeof alias === "string" && alias.trim().length > 0);

  return normalizeToolDefinition(row, aliases);
}
