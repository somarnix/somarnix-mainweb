"use client";

import { useEffect, useMemo, useState } from "react";

import { ShareButton } from "@/app/components/ShareButton";
import { ToolsPage } from "./ToolsPage";
import type { ToolDefinitionClientRecord } from "./tool-runtime-types";
import {
  hasToolHandler,
  renderToolHandler,
  resolveLegacyToolHandlerKey,
} from "./tool-handlers";

type ToolDefinitionApiResponse = {
  tool?: {
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
    config?: Record<string, unknown> | null;
  };
  error?: string;
};

export default function ToolRuntimePage({
  slug,
  onOpenProductDetail,
}: {
  slug: string;
  onOpenProductDetail: (slug: string) => void;
}) {
  const [definition, setDefinition] = useState<ToolDefinitionClientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setDefinition(null);
      setError(null);

      try {
        const res = await fetch(`/api/tools/definition?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => ({}))) as ToolDefinitionApiResponse;

        if (!alive) return;

        if (res.ok && data.tool) {
          setDefinition({
            canonicalSlug: data.tool.canonicalSlug,
            handlerKey: data.tool.handlerKey,
            productSlug: data.tool.productSlug,
            productTitle: data.tool.productTitle,
            launchPath: data.tool.launchPath ?? null,
            embeddedEntry: data.tool.embeddedEntry ?? null,
            toolKind: data.tool.toolKind,
            accessModel: data.tool.accessModel,
            deliveryModel: data.tool.deliveryModel,
            isActive: data.tool.isActive !== false,
            aliases: Array.isArray(data.tool.aliases) ? data.tool.aliases : [],
            config: data.tool.config ?? null,
          });
          return;
        }

        const legacyHandler = resolveLegacyToolHandlerKey(slug);
        if (legacyHandler) {
          setDefinition({
            canonicalSlug: slug,
            handlerKey: legacyHandler,
            productSlug: slug,
            productTitle: slug,
            launchPath: null,
            embeddedEntry: null,
            toolKind: "embedded",
            accessModel: "purchase",
            deliveryModel: "web",
            isActive: true,
            aliases: [],
            config: null,
          });
          return;
        }

        setError(typeof data.error === "string" ? data.error : "Tool definition not found");
      } catch (err) {
        if (!alive) return;

        const legacyHandler = resolveLegacyToolHandlerKey(slug);
        if (legacyHandler) {
          setDefinition({
            canonicalSlug: slug,
            handlerKey: legacyHandler,
            productSlug: slug,
            productTitle: slug,
            launchPath: null,
            embeddedEntry: null,
            toolKind: "embedded",
            accessModel: "purchase",
            deliveryModel: "web",
            isActive: true,
            aliases: [],
            config: null,
          });
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load tool");
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [slug]);

  const renderedTool = useMemo(() => {
    if (!definition) return null;
    return renderToolHandler({
      toolSlug: slug,
      definition,
    });
  }, [definition, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Loading tool...</div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Resolving tool definition for <code>{slug}</code>.
          </p>
        </div>
      </div>
    );
  }

  if (definition?.handlerKey && definition.isActive && hasToolHandler(definition.handlerKey) && renderedTool) {
    return (
      <div className="relative">
        <div className="fixed bottom-6 right-6 z-40">
          <ShareButton
            path={`/tools-ai/${encodeURIComponent(slug)}`}
            title={definition.productTitle || slug}
            text={definition.productTitle || slug}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-[0_16px_32px_rgba(15,23,42,0.24)] backdrop-blur transition hover:-translate-y-0.5 hover:text-blue-600"
          />
        </div>
        {renderedTool}
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-16 dark:bg-gray-900">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-900 dark:bg-gray-900">
          <div className="text-lg font-semibold text-red-600">Tool unavailable</div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{error}</p>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => onOpenProductDetail(slug)}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
            >
              Open product page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <ToolsPage onOpenProductDetail={onOpenProductDetail} />;
}
