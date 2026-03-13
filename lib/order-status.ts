export const ORDER_STATUS_VALUES = [
  "pending",
  "approved",
  "delivering",
  "completed",
  "cancelled",
  "resolution",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

export function normalizeStatusKeyword(
  value: string | null | undefined,
  fallback: OrderStatus = "pending"
): OrderStatus {
  const input = (value ?? "").toLowerCase();
  switch (input) {
    case "approved":
    case "approve":
      return "approved";
    case "delivering":
    case "delivered":
    case "delivery":
      return "delivering";
    case "completed":
    case "complete":
    case "done":
      return "completed";
    case "cancel":
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "resolution":
    case "relustion":
    case "failed":
      return "resolution";
    case "waiting_admin":
      return "pending";
    default:
      return fallback;
  }
}

export function resolveOrderStatus(
  stateValue: string | null | undefined,
  resultValue: string | null | undefined
): OrderStatus {
  const state = normalizeStatusKeyword(stateValue);
  const result = (resultValue ?? "").toLowerCase();

  if (state === "cancelled" || state === "resolution") {
    return state;
  }

  if (result === "done") {
    return "completed";
  }

  if (result === "failed") {
    return "resolution";
  }

  return state;
}
