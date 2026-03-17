export const ORDER_CONFIRMATION_WINDOW_HOURS = 2;

export const ORDER_CONFIRMATION_WINDOW_MS = ORDER_CONFIRMATION_WINDOW_HOURS * 60 * 60 * 1000;

export function getOrderConfirmationDeadline(
  createdAt: string | Date | null | undefined
): Date | null {
  if (!createdAt) return null;
  const parsed = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getTime() + ORDER_CONFIRMATION_WINDOW_MS);
}

export function hasOrderConfirmationExpired(
  createdAt: string | Date | null | undefined,
  now = Date.now()
): boolean {
  const deadline = getOrderConfirmationDeadline(createdAt);
  if (!deadline) return false;
  return deadline.getTime() <= now;
}
