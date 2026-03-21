export type ToolTemplateType =
  | "downloadable_exe"
  | "online_web"
  | "license_only"
  | "embedded_custom";

export type ToolPlanType = "one_time" | "subscription" | "time_limited";
export type ToolStatus = "draft" | "published";
export type ToolRunMode = "external_url" | "internal_page";
export type ToolLicenseType = "single_device" | "multi_device" | "unlimited";
export type EmbeddedCustomHandlerKey =
  | "veo3"
  | "video-editor"
  | "prompt-ai-studio"
  | "translate-video";

export const MAX_TOOL_DEVICES = 10;

export const TOOL_TEMPLATE_OPTIONS: Array<{
  value: ToolTemplateType;
  label: string;
  description: string;
  badge: string;
}> = [
  {
    value: "downloadable_exe",
    label: "Downloadable EXE Tool",
    description: "User buys and downloads a Windows, Mac, Linux, or Android build.",
    badge: "Download",
  },
  {
    value: "online_web",
    label: "Online Web Tool",
    description: "User opens the tool in browser with purchase or license access checks.",
    badge: "Web",
  },
  {
    value: "license_only",
    label: "License-Only Tool",
    description: "User mainly receives a key or access entitlement with instructions.",
    badge: "License",
  },
  {
    value: "embedded_custom",
    label: "Embedded Custom Tool",
    description: "Reuse an existing developer-made TSX tool without new route wiring.",
    badge: "Custom",
  },
];

export const EMBEDDED_CUSTOM_HANDLER_OPTIONS: Array<{
  value: EmbeddedCustomHandlerKey;
  label: string;
  description: string;
}> = [
  {
    value: "prompt-ai-studio",
    label: "Prompt AI Studio",
    description: "Prompt generation and creative workflow tool.",
  },
  {
    value: "video-editor",
    label: "Video Editor Studio",
    description: "Video editing interface with merge, split, and export workflows.",
  },
  {
    value: "translate-video",
    label: "Translate Video AI",
    description: "Translation and subtitle processing tool.",
  },
  {
    value: "veo3",
    label: "Veo3 Tool",
    description: "Existing Veo3 access-gated tool shell.",
  },
];

export function generateToolSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getDefaultLicenseRequired(template: ToolTemplateType): boolean {
  return template === "downloadable_exe" || template === "license_only";
}

export function getDefaultPlanType(template: ToolTemplateType): ToolPlanType {
  return template === "license_only" ? "time_limited" : "one_time";
}

