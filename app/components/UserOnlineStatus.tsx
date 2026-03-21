"use client";

import { cn } from "./ui/utils";

type UserOnlineStatusProps = {
  online: boolean;
  className?: string;
  showLabel?: boolean;
  onlineLabel?: string;
  offlineLabel?: string;
  dotClassName?: string;
  hideWhenOffline?: boolean;
};

export function UserOnlineStatus({
  online,
  className,
  showLabel = true,
  onlineLabel = "Online",
  offlineLabel = "Offline",
  dotClassName,
  hideWhenOffline = false,
}: UserOnlineStatusProps) {
  if (hideWhenOffline && !online) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2",
        online ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex h-2.5 w-2.5 rounded-full",
          online ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" : "bg-slate-300 dark:bg-slate-600",
          dotClassName
        )}
      />
      {showLabel ? <span className="text-xs font-semibold">{online ? onlineLabel : offlineLabel}</span> : null}
    </div>
  );
}
