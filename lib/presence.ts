import { db } from "./db";

export type PresenceRecord = {
  user_id: number;
  last_active_at: Date | string | null;
  status: "online" | "offline";
};

type PresenceStatus = "online" | "offline";

async function persistPresence(userId: number, status: PresenceStatus) {
  try {
    await db.query(
      `
      INSERT INTO user_presence (user_id, last_active_at, status)
      VALUES (?, NOW(), ?)
      ON DUPLICATE KEY UPDATE last_active_at = NOW(), status = VALUES(status)
      `,
      [userId, status]
    );
  } catch (err) {
    console.error("presence update error", err);
  }
}

export async function touchUserPresence(userId: number) {
  await persistPresence(userId, "online");
}

export async function setUserPresenceStatus(
  userId: number,
  status: PresenceStatus
) {
  await persistPresence(userId, status);
}

export function isOnline(record: PresenceRecord | null, minutes = 5): boolean {
  if (!record || !record.last_active_at) return false;
  const lastActive = new Date(record.last_active_at);
  if (Number.isNaN(lastActive.getTime())) return false;
  const diff = Date.now() - lastActive.getTime();
  return diff <= minutes * 60 * 1000;
}
