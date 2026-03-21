/**
 * Dynamic Tool Catalog Page
 * 
 * Displays all available tools from the database
 * Supports filtering by category, platform, and search
 * 
 * Usage: Import and use in your main tools page
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { Wrench, Download, Globe, Smartphone, Laptop, Shield, Sparkles } from "lucide-react";

type ToolDefinition = {
  id: number;
  productId: number;
  slug: string;
  name: string;
  description?: string | null;
  kind: "online" | "downloadable" | "offline_licensed" | "embedded" | "hybrid";
  category: "ai" | "video" | "image" | "productivity" | "utility" | "other";
  platform: "any" | "web" | "pc" | "mobile" | "pc+mobile";
  accessModel: "none" | "purchase" | "license" | "subscription";
  deliveryModel: "web" | "download" | "license" | "download+license";
  requiresLicense: boolean;
  deviceLimit: number;
  allowOfflineMode: boolean;
  launchPath?: string | null;
  currentVersion?: string | null;
  isBeta: boolean;
  config?: any | null;
};

type FilterState = {
  category: string;
  platform: string;
  kind: string;
  search: string;
  showOnlyFeatured: boolean;
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "ai", label: "AI Tools" },
  { value: "video", label: "Video" },
  { value: "image", label: "Image" },
  { value: "productivity", label: "Productivity" },
  { value: "utility", label: "Utility" },
  { value: "other", label: "Other" },
];

const PLATFORM_OPTIONS = [
  { value: "", label: "All Platforms" },
  { value: "web", label: "Web" },
  { value: "pc", label: "PC" },
  { value: "mobile", label: "Mobile" },
];

const KIND_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "online", label: "Online Tool" },
  { value: "downloadable", label: "Downloadable" },
  { value: "offline_licensed", label: "Offline Licensed" },
  { value: "embedded", label: "Embedded" },
];

export function ToolCatalog({
  onToolSelect,
}: {
  onToolSelect?: (tool: ToolDefinition) => void;
}) {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    category: "",
    platform: "",
    kind: "",
    search: "",
    showOnlyFeatured: false,
  });

  // Fetch tools from API
  useEffect(() => {
    async function fetchTools() {
      try {
        setLoading(true);
        const res = await fetch("/api/tools/definition/list?active=true", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load tools");
        }

        const data = await res.json();
        setTools(data.tools || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tools");
      } finally {
        setLoading(false);
      }
    }

    fetchTools();
  }, []);

  // Filter tools
  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      if (filters.category && tool.category !== filters.category) return false;
      if (filters.platform && tool.platform !== filters.platform && tool.platform !== "any")
        return false;
      if (filters.kind && tool.kind !== filters.kind) return false;
      if (
        filters.search &&
        !tool.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !tool.description?.toLowerCase().includes(filters.search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [tools, filters]);

  // Get icon for tool kind
  function getToolIcon(tool: ToolDefinition) {
    switch (tool.kind) {
      case "online":
      case "embedded":
        return <Globe className="h-5 w-5" />;
      case "downloadable":
        return <Download className="h-5 w-5" />;
      case "offline_licensed":
        return <Shield className="h-5 w-5" />;
      default:
        return <Wrench className="h-5 w-5" />;
    }
  }

  // Get platform badge
  function getPlatformBadge(platform: string) {
    switch (platform) {
      case "web":
        return { icon: <Globe className="h-3 w-3" />, label: "Web" };
      case "pc":
        return { icon: <Laptop className="h-3 w-3" />, label: "PC" };
      case "mobile":
        return { icon: <Smartphone className="h-3 w-3" />, label: "Mobile" };
      default:
        return { icon: <Globe className="h-3 w-3" />, label: "Any" };
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading tools...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Platform
            </label>
            <select
              value={filters.platform}
              onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            >
              {PLATFORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={filters.kind}
              onChange={(e) => setFilters({ ...filters, kind: e.target.value })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search tools..."
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredTools.length} of {tools.length} tools
          </p>
        </div>
      </div>

      {/* Tools Grid */}
      {filteredTools.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No tools found matching your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => (
            <div
              key={tool.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onToolSelect?.(tool)}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                      {getToolIcon(tool)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {tool.name}
                      </h3>
                      {tool.isBeta && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <Sparkles className="h-3 w-3" />
                          Beta
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Description */}
                {tool.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {tool.description}
                  </p>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {/* Platform Badge */}
                  {(() => {
                    const badge = getPlatformBadge(tool.platform);
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">
                        {badge.icon}
                        {badge.label}
                      </span>
                    );
                  })()}

                  {/* Access Model */}
                  <span className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-400">
                    {tool.accessModel === "license" && "License Required"}
                    {tool.accessModel === "purchase" && "Purchase Required"}
                    {tool.accessModel === "subscription" && "Subscription"}
                    {tool.accessModel === "none" && "Free"}
                  </span>

                  {/* Delivery Model */}
                  {tool.deliveryModel.includes("download") && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-700 dark:text-purple-400">
                      <Download className="h-3 w-3" />
                      Downloadable
                    </span>
                  )}

                  {tool.allowOfflineMode && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded text-xs text-green-700 dark:text-green-400">
                      <Shield className="h-3 w-3" />
                      Offline Mode
                    </span>
                  )}
                </div>

                {/* Device Limit */}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Device limit: {tool.deviceLimit} devices
                </div>

                {/* Version */}
                {tool.currentVersion && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Version: {tool.currentVersion}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToolSelect?.(tool);
                  }}
                >
                  {tool.kind === "embedded" || tool.kind === "online"
                    ? "Open Tool"
                    : tool.deliveryModel.includes("download")
                    ? "Download"
                    : "Learn More"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
