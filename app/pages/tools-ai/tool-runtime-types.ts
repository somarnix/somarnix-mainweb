"use client";

export type ToolDefinitionClientRecord = {
  canonicalSlug: string;
  handlerKey: string;
  productSlug: string;
  productTitle: string;
  launchPath: string | null;
  embeddedEntry?: string | null;
  toolKind?: string;
  accessModel?: string;
  deliveryModel?: string;
  isActive: boolean;
  aliases?: string[];
  config: Record<string, unknown> | null;
};

export function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

