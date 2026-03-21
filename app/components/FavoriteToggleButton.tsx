"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import {
  FAVORITES_CHANGED_EVENT,
  type FavoriteItemInput,
  isFavoriteItem,
  toggleFavoriteItem,
} from "../lib/favorites";

type FavoriteToggleButtonProps = {
  item: FavoriteItemInput;
  className?: string;
  iconClassName?: string;
};

export function FavoriteToggleButton({
  item,
  className,
  iconClassName,
}: FavoriteToggleButtonProps) {
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    const sync = () => setFavorited(isFavoriteItem(item.type, item.slug));
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
  }, [item.slug, item.type]);

  return (
    <button
      type="button"
      aria-label={favorited ? "Remove favorite" : "Add favorite"}
      aria-pressed={favorited}
      onClick={(event) => {
        event.stopPropagation();
        const result = toggleFavoriteItem(item);
        setFavorited(result.favorited);
      }}
      className={
        className ??
        "absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/92 text-slate-500 shadow-[0_12px_26px_rgba(15,23,42,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:text-rose-500"
      }
    >
      <Heart
        className={
          iconClassName ??
          `h-5 w-5 transition ${favorited ? "fill-rose-500 text-rose-500" : ""}`
        }
      />
    </button>
  );
}
