/**
 * Secure Tool Download Helper
 * 
 * Usage:
 * const { downloadUrl, loading, error, download } = useToolDownload('tool-slug');
 * download(); // Triggers download
 */

"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

type DownloadState = {
  downloadUrl: string | null;
  fileName: string | null;
  loading: boolean;
  error: string | null;
  expiresAt: string | null;
  checksum: {
    sha256?: string;
  } | null;
};

export function useToolDownload(slug: string) {
  const [state, setState] = useState<DownloadState>({
    downloadUrl: null,
    fileName: null,
    loading: false,
    error: null,
    expiresAt: null,
    checksum: null,
  });

  const download = useCallback(
    async (token: string, deviceId: string): Promise<boolean> => {
      if (!token) {
        toast.error("No valid license token");
        return false;
      }

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        // Request download URL from backend
        const res = await fetch("/api/tools/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            token,
            deviceId,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to get download URL");
        }

        setState({
          downloadUrl: data.downloadUrl,
          fileName: data.fileName,
          loading: false,
          error: null,
          expiresAt: data.expiresAt,
          checksum: data.checksum,
        });

        // Trigger download
        // Note: For cross-origin downloads, we need to open in new tab
        // or use a download link
        window.open(data.downloadUrl, "_blank");

        toast.success(`Downloading ${data.fileName}...`);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Download failed";
        setState((s) => ({
          ...s,
          loading: false,
          error: message,
          downloadUrl: null,
        }));
        toast.error(message);
        return false;
      }
    },
    [slug]
  );

  const clear = useCallback(() => {
    setState({
      downloadUrl: null,
      fileName: null,
      loading: false,
      error: null,
      expiresAt: null,
      checksum: null,
    });
  }, []);

  return {
    ...state,
    download,
    clear,
  };
}

/**
 * Download button component for tools
 */
export function ToolDownloadButton({
  slug,
  token,
  deviceId,
  disabled = false,
  className = "",
}: {
  slug: string;
  token: string | null;
  deviceId: string;
  disabled?: boolean;
  className?: string;
}) {
  const { downloadUrl, loading, error, download, fileName } = useToolDownload(slug);

  const handleClick = async () => {
    if (!token) {
      toast.error("Please activate your license first");
      return;
    }
    await download(token, deviceId);
  };

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={loading || disabled || !token}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Preparing...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {fileName || "Download"}
          </>
        )}
      </button>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {downloadUrl && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Download started. If it doesn&apos;t begin,{" "}
          <a href={downloadUrl} className="text-green-600 hover:underline">
            click here
          </a>
          .
        </p>
      )}
    </div>
  );
}
