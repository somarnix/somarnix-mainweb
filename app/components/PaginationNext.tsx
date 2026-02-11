"use client";

import { useEffect } from "react";

type PaginationNextProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
  enableKeyboardShortcuts?: boolean;
};

function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    target.isContentEditable
  );
}

export default function PaginationNext({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = "",
  enableKeyboardShortcuts = true,
}: PaginationNextProps) {
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const showingFrom = pageStart + 1;
  const showingTo = Math.min(pageStart + pageSize, totalItems);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  useEffect(() => {
    if (!enableKeyboardShortcuts) return;
    if (totalPages <= 1) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) return;

      if (event.key === "ArrowLeft" && canPrev) {
        event.preventDefault();
        onPageChange(safePage - 1);
      }
      if (event.key === "ArrowRight" && canNext) {
        event.preventDefault();
        onPageChange(safePage + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enableKeyboardShortcuts, canPrev, canNext, onPageChange, safePage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 ${className}`.trim()}>
      <p className="text-sm text-gray-600">
        Showing {showingFrom}-{showingTo} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={!canPrev}
          className="rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          title="Previous page (ArrowLeft)"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {safePage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={!canNext}
          className="rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          title="Next page (ArrowRight)"
        >
          Next
        </button>
      </div>
    </div>
  );
}
