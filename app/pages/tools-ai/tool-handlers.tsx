"use client";

import type { ReactNode } from "react";

import GenericDownloadTool from "./GenericDownloadTool";
import GenericLicenseTool from "./GenericLicenseTool";
import GenericOnlineTool from "./GenericOnlineTool";
import type { ToolDefinitionClientRecord } from "./tool-runtime-types";
import Veo3 from "./veo3/Veo3";
import ToolDownload from "./tooldownloadvideo/ToolDownload";
import VideoEditorPage from "./video-editor/Videoeditor";
import TranslateVideoAI from "./translatevideo/TranslateVideoAI";
import PromtAi from "./promt-ai/PromtAi";

type ToolHandlerRenderInput = {
  toolSlug: string;
  definition: ToolDefinitionClientRecord | null;
};

type ToolHandlerRenderer = (input: ToolHandlerRenderInput) => ReactNode;

const TOOL_HANDLERS: Record<string, ToolHandlerRenderer> = {
  veo3: ({ toolSlug }) => <Veo3 toolSlug={toolSlug} />,
  "download-tool": ({ toolSlug }) => <ToolDownload toolSlug={toolSlug} />,
  "generic-download-tool": ({ toolSlug, definition }) => (
    <GenericDownloadTool toolSlug={toolSlug} definition={definition} />
  ),
  "generic-online-tool": ({ toolSlug, definition }) => (
    <GenericOnlineTool toolSlug={toolSlug} definition={definition} />
  ),
  "generic-license-tool": ({ toolSlug, definition }) => (
    <GenericLicenseTool toolSlug={toolSlug} definition={definition} />
  ),
  "video-editor": ({ toolSlug }) => <VideoEditorPage toolSlug={toolSlug} />,
  "translate-video": () => <TranslateVideoAI />,
  "prompt-ai-studio": ({ toolSlug }) => <PromtAi toolSlug={toolSlug} />,
};

function normalizeLegacyToolSlug(value?: string | null): string {
  const slug = (value ?? "").trim().toLowerCase();
  if (!slug) return "";
  if (slug === "toolveo3") return "veo3";
  if (slug === "videoeditor") return "video-editor";
  if (slug === "translatevideo-ai") return "translate-video";
  if (slug === "translatevideo") return "translate-video";
  if (slug === "prompt-ai") return "prompt-ai-studio";
  if (slug === "promt-ai") return "prompt-ai-studio";
  if (slug === "tooldownloadvideo") return "download-tool";
  return slug;
}

export function resolveLegacyToolHandlerKey(slug?: string | null): string | null {
  const normalized = normalizeLegacyToolSlug(slug);
  if (!normalized) return null;
  return normalized in TOOL_HANDLERS ? normalized : null;
}

export function hasToolHandler(handlerKey?: string | null): boolean {
  if (!handlerKey) return false;
  return handlerKey in TOOL_HANDLERS;
}

export function renderToolHandler(input: ToolHandlerRenderInput): ReactNode {
  const directHandler = input.definition?.handlerKey;
  const fallbackHandler = resolveLegacyToolHandlerKey(input.toolSlug);
  const handlerKey = directHandler && hasToolHandler(directHandler) ? directHandler : fallbackHandler;

  if (!handlerKey) return null;

  const renderer = TOOL_HANDLERS[handlerKey];
  if (!renderer) return null;

  const runtimeSlug = input.definition?.canonicalSlug || input.toolSlug;
  return renderer({
    toolSlug: runtimeSlug,
    definition: input.definition,
  });
}
