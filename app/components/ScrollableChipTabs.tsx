"use client";

import { useEffect, useRef } from "react";

type ScrollableChipTabItem = {
  key: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  className: string;
  countClassName?: string;
};

interface ScrollableChipTabsProps {
  items: ScrollableChipTabItem[];
  className?: string;
}

export function ScrollableChipTabs({
  items,
  className = "",
}: ScrollableChipTabsProps) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeKey = items.find((item) => item.active)?.key;

  useEffect(() => {
    if (!activeKey) return;
    const activeNode = itemRefs.current[activeKey];
    if (!activeNode) return;
    activeNode.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeKey]);

  return (
    <div
      className={`overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <div className="flex min-w-max flex-nowrap gap-2 md:min-w-0 md:flex-wrap">
        {items.map((item) => (
          <button
            key={item.key}
            ref={(node) => {
              itemRefs.current[item.key] = node;
            }}
            onClick={item.onClick}
            className={`shrink-0 ${item.className}`}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" ? (
              <span className={item.countClassName}>{item.count}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
