"use client";

import { useEffect, useState } from "react";

type PresenceState = {
  status: string | null;
  lastActiveAt: string | null;
  online: boolean;
};

const EMPTY_PRESENCE: PresenceState = {
  status: null,
  lastActiveAt: null,
  online: false,
};

export function useUserPresence(userId: number | null | undefined, pollMs = 30000) {
  const [presence, setPresence] = useState<PresenceState>(EMPTY_PRESENCE);

  useEffect(() => {
    if (!userId || userId <= 0) {
      setPresence(EMPTY_PRESENCE);
      return;
    }

    let active = true;

    const loadPresence = async () => {
      try {
        const res = await fetch(`/api/presence/users?ids=${userId}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          users?: Array<{
            userId: number;
            status?: string | null;
            lastActiveAt?: string | null;
            online?: boolean;
          }>;
        };
        if (!active) return;
        const row = Array.isArray(data.users) ? data.users[0] : null;
        setPresence({
          status: row?.status ?? null,
          lastActiveAt: row?.lastActiveAt ?? null,
          online: row?.online === true,
        });
      } catch {
        if (!active) return;
      }
    };

    void loadPresence();
    const interval = window.setInterval(() => void loadPresence(), pollMs);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [pollMs, userId]);

  return presence;
}
